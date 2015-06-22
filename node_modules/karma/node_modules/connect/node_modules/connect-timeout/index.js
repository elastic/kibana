/*!
 * connect-timeout
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var debug = require('debug')('connect:timeout');
var ms = require('ms');
var onHeaders = require('on-headers');

/**
 * Timeout:
 *
 * See README.md for documentation.
 *
 * @param {Number} time
 * @param {Object} options
 * @return {Function} middleware
 * @api public
 */

module.exports = function timeout(time, options) {
  options = options || {};

  time = typeof time === 'string'
    ? ms(time)
    : Number(time || 5000);

  var respond = !('respond' in options) || options.respond === true;

  return function(req, res, next) {
    var destroy = req.socket.destroy;
    var id = setTimeout(function(){
      req.timedout = true;
      req.emit('timeout', time);
    }, time);

    if (respond) {
      req.on('timeout', onTimeout(time, next));
    }

    req.clearTimeout = function(){
      clearTimeout(id);
    };

    req.socket.destroy = function(){
      clearTimeout(id);
      destroy.call(this);
    };

    req.timedout = false;

    onHeaders(res, function(){
      clearTimeout(id);
    });

    next();
  };
};

function generateTimeoutError(){
  var err = new Error('Response timeout');
  err.code = 'ETIMEDOUT';
  err.status = 503;
  return err;
}

function onTimeout(time, cb){
  return function(){
    var err = generateTimeoutError();
    err.timeout = time;
    cb(err);
  };
}
