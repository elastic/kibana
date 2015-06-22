
/*!
 * Connect - vhost
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var vhost = require('vhost');

/**
 * Vhost:
 *
 * See [vhost](https://github.com/expressjs/vhost)
 *
 * @param {String} hostname
 * @param {Server} server
 * @return {Function}
 * @api public
 */

module.exports = function(hostname, server) {
  if (typeof hostname === 'string') {
    // back-compat
    hostname = new RegExp('^' + hostname.replace(/[^*\w]/g, '\\$&').replace(/[*]/g, '(?:.*?)')  + '$', 'i');
  }

  if (typeof server !== 'function' && typeof server.emit === 'function') {
    // back-compat
    server = createEmitRequest(server);
  }

  return vhost(hostname, server);
};

function createEmitRequest(server) {
  return function emitRequest(req, res) {
    server.emit('request', req, res);
  };
}
