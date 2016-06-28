'use strict';

var EventEmitter = require('events').EventEmitter,
    debug        = require('debug')('nock.socket');

module.exports = Socket;

function Socket() {
  var socket = new EventEmitter();

  socket.writable = true;
  socket.readable = true;

  socket.setNoDelay = noop;
  socket.setTimeout = function(timeout, fn) {
    this.timeout = timeout;
    this.timeoutFunction = fn;
  }
  socket._checkTimeout = function(delay) {
    if (this.timeout && delay > this.timeout) {
      debug('socket timeout');
      if (this.timeoutFunction) {
        this.timeoutFunction();
      }
      else {
        this.emit('timeout');
      }
    }
  }

  socket.setKeepAlive = noop;
  socket.destroy = noop;
  socket.resume = noop;

  socket.getPeerCertificate = getPeerCertificate;

  return socket;
}

function noop() {}

function getPeerCertificate() {
  return new Buffer((Math.random() * 10000 + Date.now()).toString()).toString('base64');
}
