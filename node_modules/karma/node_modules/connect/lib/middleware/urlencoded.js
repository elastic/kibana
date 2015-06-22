/*!
 * Connect - urlencoded
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var bodyParser = require('body-parser');
var deprecate = require('depd')('connect');
var utils = require('../utils');

/**
 * Urlencoded:
 *
 * See [body-parser](https://github.com/expressjs/body-parser)
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

module.exports = function urlencoded(options) {
  var opts = utils.merge({
    extended: true,
    limit: '1mb'
  }, options);

  // back-compat verify function
  if (typeof opts.verify === 'function') {
    deprecate('urlencoded.verify: use body-parser module for verify');
    opts.verify = convertVerify(opts.verify);
  }

  return bodyParser.urlencoded(opts);
};

/**
 * Convert old verify signature to body-parser version.
 *
 * @param {Function} verify
 * @return {Function}
 * @api private
 */

function convertVerify(verify) {
  return function (req, res, buf, encoding) {
    verify(req, res, buf.toString(encoding));
  };
}
