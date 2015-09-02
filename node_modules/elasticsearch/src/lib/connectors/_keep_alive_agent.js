var ForeverAgent = require('forever-agent');
var ForeverSSLAgent = require('forever-agent').SSL;

var NativeAgent = require('http').Agent;
var NativeSSLAgent = require('https').Agent;

var inherits = require('util').inherits;
var nativeKeepAlive = (function () {
  var a = new NativeAgent();
  return !!a.freeSockets;
}());

function WrapForeverAgent(opts) {
  ForeverAgent.call(this, opts);
  var _addRequest = this.addRequest;
  this.addRequest = function (req, host, port) {
    req.useChunkedEncodingByDefault = false;
    _addRequest.call(this, req, host, port);
  };
}
inherits(WrapForeverAgent, ForeverAgent);

function WrapForeverSSLAgent(opts) {
  ForeverSSLAgent.call(this, opts);
  var _addRequest = this.addRequest;
  this.addRequest = function (req, host, port) {
    req.useChunkedEncodingByDefault = false;
    _addRequest.call(this, req, host, port);
  };
}
inherits(WrapForeverSSLAgent, ForeverSSLAgent);

function WrapNativeAgent(opts) { NativeAgent.call(this, opts); }
inherits(WrapNativeAgent, NativeAgent);

function WrapNativeSSLAgent(opts) { NativeSSLAgent.call(this, opts); }
inherits(WrapNativeSSLAgent, NativeSSLAgent);


if (nativeKeepAlive) {
  module.exports = WrapNativeAgent;
  module.exports.SSL = WrapNativeSSLAgent;
} else {
  module.exports = WrapForeverAgent;
  module.exports.SSL = WrapForeverSSLAgent;
}

module.exports.supportsNativeKeepAlive = nativeKeepAlive;