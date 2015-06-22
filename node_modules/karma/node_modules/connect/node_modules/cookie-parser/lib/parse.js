var signature = require('cookie-signature');

/**
 * Parse signed cookies, returning an object
 * containing the decoded key/value pairs,
 * while removing the signed key from `obj`.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

exports.signedCookies = function(obj, secret){
  var cookies = Object.keys(obj);
  var dec;
  var key;
  var ret = Object.create(null);
  var val;

  for (var i = 0; i < cookies.length; i++) {
    key = cookies[i];
    val = obj[key];
    dec = exports.signedCookie(val, secret);

    if (val !== dec) {
      ret[key] = dec;
      delete obj[key];
    }
  }

  return ret;
};

/**
 * Parse a signed cookie string, return the decoded value
 *
 * @param {String} str signed cookie string
 * @param {String} secret
 * @return {String} decoded value
 * @api private
 */

exports.signedCookie = function(str, secret){
  return str.substr(0, 2) === 's:'
    ? signature.unsign(str.slice(2), secret)
    : str;
};

/**
 * Parse JSON cookies.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

exports.JSONCookies = function(obj){
  var cookies = Object.keys(obj);
  var key;
  var val;

  for (var i = 0; i < cookies.length; i++) {
    key = cookies[i];
    val = exports.JSONCookie(obj[key]);

    if (val) {
      obj[key] = val;
    }
  }

  return obj;
};

/**
 * Parse JSON cookie string
 *
 * @param {String} str
 * @return {Object} Parsed object or null if not json cookie
 * @api private
 */

exports.JSONCookie = function(str) {
  if (!str || str.substr(0, 2) !== 'j:') return;

  try {
    return JSON.parse(str.slice(2));
  } catch (err) {
    // no op
  }
};
