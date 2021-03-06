const W3Main = require("./w3_main.js");
const bitcoinjs = require('bitcoinjs-lib');
const btcClient = require('bitcoin-core');
const request = require('request');
const bitcoincashjs = require('bitcoincashjs');
var MININGFEE = W3Main.toSatoshi(0.001);

var W3BitcoinCash = function(){

	var self = this;

	self.initWallet = function(){
		W3Main.initWallet('BCH');
		const testnet = bitcoinjs.networks.testnet;
		var keyPair = new bitcoinjs.ECPair(W3Main.node.keyPair.d, null, { compressed: true,  network: testnet});
		self.privkey = keyPair.toWIF();
		var address = new bitcoincashjs.PrivateKey(self.privkey).toAddress();
		self.cashAddress = address.toString(bitcoincashjs.Address.CashAddrFormat);
		self.legacyAddress = address.toString();

		W3Main.print("Bitcoin Cash Address: ", self.cashAddress);
		W3Main.print("Bitcoin Cash Legacy Address: ", self.legacyAddress);
		W3Main.print("Private Key: ", self.privkey);	
	}

	self.initTx = function(recipient, amount){
		var testCashAddress = "bchtest:qr3l7nzxxthrvzucgm2l66ld9xt42a8apullqlwjhy", testLegacyAddress = "n2JVX1dx1A933zzwFNWhgjqGYnXympvqh7", privateKey = "cRr2FLe1sCvKt9cmmx6ZfEFsjKStQLmKHLMHLaz4VHeJGPJXeHAM"

		var account = new bitcoincashjs.PrivateKey(privateKey);
		var change, txnhex, finalTxid, input = 0, inputs = [], privateKeys = [];

		if (recipient.includes('bitcoincash') || recipient.includes('bchtest')) {
			recipient = bitcoincashjs.Address.fromString(recipient, 'testnet', 'pubkeyhash', bitcoincashjs.Address.CashAddrFormat).toString();
		}
		
		amount = W3Main.toSatoshi(amount);
		var txn = new bitcoincashjs.Transaction(bitcoincashjs.Networks.testnet);

		request.get('https://tbch.blockdozer.com/insight-api/addr/'+testCashAddress+'/utxo', function(error, response, body){
			console.log(body);
			if(body){
				var utxos = JSON.parse(body);
				for (var utx of utxos) {
					if (utx.scriptPubKey) {
						inputs.push(utx);
						privateKeys.push(account);
						input += utx.satoshis;
						if (input >= (amount + MININGFEE)) break;
					}
				}

				if (input <= (amount + MININGFEE)) {
					W3Main.print('Bitcoin Cash transaction error: ', 'Insufficient funds');
				}
				else{
					change = input - (amount + MININGFEE);
					txn.from(inputs);
					txn.to(recipient, amount);
					if (change) {
						txn.change(testLegacyAddress, change);
					}
				}

				txn.sign(privateKeys);

				txnhex = txn.toString();

				W3Main.print("Raw transaction hex: ", txnhex);

				request({
					method: 'POST',
					uri: 'https://tbch.blockdozer.com/insight-api/tx/send',
					body: {
						'rawtx': txnhex
					},
					json: true
				}, function(error, response, body){
					W3Main.print("error: ", error);
					W3Main.print("body: ", body);
					if (body) {
						if (body.txid) {
							finalTxid = body.txid;
							console.log("Final transaction ID: ", finalTxid);
						}
					}
				});
			}
			else{
				W3Main.print("error: ", "No transactions present")
			}

		});
	}

	self.getBalance = function(address){
		request.get('https://tbch.blockdozer.com/insight-api/addr/'+ address +'/balance', function(error, response, body){
			if (response && response.statusCode == 200 && body){
				console.log(body);
			} else {
				console.log(0);
			}
		});
	}

}

module.exports = new W3BitcoinCash();