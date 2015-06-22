/*!
 * cookie-parser
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var cookie = require('cookie');
var parse = require('./lib/parse');

/**
 * Parse Cookie header and populate `req.cookies`
 * with an object keyed by the cookie names.
 *
 * @param {String} [secret]
 * @param {Object} [options]
 * @return {Function}
 * @api public
 */

exports = module.exports = function cookieParser(secret, options){
  return function cookieParser(req, res, next) {
    if (req.cookies) return next();
    var cookies = req.headers.cookie;

    req.secret = secret;
    req.cookies = Object.create(null);
    req.signedCookies = Object.create(null);

    // no cookies
    if (!cookies) {
      return next();
    }

    req.cookies = cookie.parse(cookies, options);

    // parse signed cookies
    if (secret) {
      req.signedCookies = parse.signedCookies(req.cookies, secret);
      req.signedCookies = parse.JSONCookies(req.signedCookies);
    }

    // parse JSON cookies
    req.cookies = parse.JSONCookies(req.cookies);

    next();
  };
};

/**
 * Export parsing functions.
 */

exports.JSONCookie = parse.JSONCookie;
exports.JSONCookies = parse.JSONCookies;
exports.signedCookie = parse.signedCookie;
exports.signedCookies = parse.signedCookies;
