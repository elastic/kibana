/*!
 * Connect - session
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var expressSession = require('express-session');
var utils = require('../utils');

/**
 * Session:
 *
 *   Setup session store with the given `options`.
 *
 * See [express-session](https://github.com/expressjs/session)
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

module.exports = exports = function session(options) {
  var opts = utils.merge({
    resave: true,
    saveUninitialized: true
  }, options);

  return expressSession(opts);
};

exports.Cookie = expressSession.Cookie;
exports.MemoryStore = expressSession.MemoryStore;
exports.Session = expressSession.Session;
exports.Store = expressSession.Store;
