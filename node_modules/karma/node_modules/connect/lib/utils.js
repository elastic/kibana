
/*!
 * Connect - utils
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var bytes = require('bytes');
var cookieParser = require('cookie-parser');
var deprecate = require('depd')('connect');
var http = require('http')
  , crypto = require('crypto')
  , parseurl = require('parseurl')
  , sep = require('path').sep
  , signature = require('cookie-signature')
  , typeis = require('type-is')
  , nodeVersion = process.versions.node.split('.');
var typer = require('media-typer');

/**
 * pause is broken in node < 0.10
 */
exports.brokenPause = parseInt(nodeVersion[0], 10) === 0
  && parseInt(nodeVersion[1], 10) < 10;

/**
 * Return `true` if the request has a body, otherwise return `false`.
 *
 * @param  {IncomingMessage} req
 * @return {Boolean}
 * @api private
 */

exports.hasBody = deprecate.function(typeis.hasBody,
  'utils.hasBody: use type-is npm module instead');

/**
 * Extract the mime type from the given request's
 * _Content-Type_ header.
 *
 * @param  {IncomingMessage} req
 * @return {String}
 * @api private
 */

exports.mime = function(req) {
  var str = req.headers['content-type'] || ''
    , i = str.indexOf(';');
  return ~i ? str.slice(0, i) : str;
};

exports.mime = deprecate.function(exports.mime,
  'utils.mime: use type-is npm module instead for mime comparisons');

/**
 * Generate an `Error` from the given status `code`
 * and optional `msg`.
 *
 * @param {Number} code
 * @param {String} msg
 * @return {Error}
 * @api private
 */

exports.error = function(code, msg){
  var err = new Error(msg || http.STATUS_CODES[code]);
  err.status = code;
  return err;
};

/**
 * Return md5 hash of the given string and optional encoding,
 * defaulting to hex.
 *
 *     utils.md5('wahoo');
 *     // => "e493298061761236c96b02ea6aa8a2ad"
 *
 * @param {String} str
 * @param {String} encoding
 * @return {String}
 * @api private
 */

exports.md5 = function(str, encoding){
  return crypto
    .createHash('md5')
    .update(str, 'utf8')
    .digest(encoding || 'hex');
};

exports.md5 = deprecate.function(exports.md5,
  'utils.md5: use crypto npm module instead for hashing');

/**
 * Merge object b with object a.
 *
 *     var a = { foo: 'bar' }
 *       , b = { bar: 'baz' };
 *
 *     utils.merge(a, b);
 *     // => { foo: 'bar', bar: 'baz' }
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object}
 * @api private
 */

exports.merge = function(a, b){
  if (a && b) {
    for (var key in b) {
      a[key] = b[key];
    }
  }
  return a;
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function(html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

exports.escape = deprecate.function(exports.escape,
  'utils.escape: use escape-html npm module instead');

/**
 * Sign the given `val` with `secret`.
 *
 * @param {String} val
 * @param {String} secret
 * @return {String}
 * @api private
 */

exports.sign = deprecate.function(signature.sign,
  'utils.sign: use cookie-signature npm module instead');

/**
 * Unsign and decode the given `val` with `secret`,
 * returning `false` if the signature is invalid.
 *
 * @param {String} val
 * @param {String} secret
 * @return {String|Boolean}
 * @api private
 */

exports.unsign = deprecate.function(signature.unsign,
  'utils.unsign: use cookie-signature npm module instead');

/**
 * Parse signed cookies, returning an object
 * containing the decoded key/value pairs,
 * while removing the signed key from `obj`.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

exports.parseSignedCookies = deprecate.function(cookieParser.signedCookies,
  'utils.parseSignedCookies: use cookie-parser npm module instead');

/**
 * Parse a signed cookie string, return the decoded value
 *
 * @param {String} str signed cookie string
 * @param {String} secret
 * @return {String} decoded value
 * @api private
 */

exports.parseSignedCookie = deprecate.function(cookieParser.signedCookie,
  'utils.parseSignedCookie: use cookie-parser npm module instead');

/**
 * Parse JSON cookies.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

exports.parseJSONCookies = deprecate.function(cookieParser.JSONCookies,
  'utils.parseJSONCookies: use cookie-parser npm module instead');

/**
 * Parse JSON cookie string
 *
 * @param {String} str
 * @return {Object} Parsed object or null if not json cookie
 * @api private
 */

exports.parseJSONCookie = deprecate.function(cookieParser.JSONCookie,
  'utils.parseJSONCookie: use cookie-parser npm module instead');

/**
 * Pause `data` and `end` events on the given `obj`.
 * Middleware performing async tasks _should_ utilize
 * this utility (or similar), to re-emit data once
 * the async operation has completed, otherwise these
 * events may be lost. Pause is only required for
 * node versions less than 10, and is replaced with
 * noop's otherwise.
 *
 *      var pause = utils.pause(req);
 *      fs.readFile(path, function(){
 *         next();
 *         pause.resume();
 *      });
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

exports.pause = exports.brokenPause
  ? require('pause')
  : function () {
    return {
      end: noop,
      resume: noop
    }
  }

/**
 * Strip `Content-*` headers from `res`.
 *
 * @param {ServerResponse} res
 * @api private
 */

exports.removeContentHeaders = function(res){
  if (!res._headers) return;
  Object.keys(res._headers).forEach(function(field){
    if (0 == field.indexOf('content')) {
      res.removeHeader(field);
    }
  });
};

exports.removeContentHeaders = deprecate.function(exports.removeContentHeaders,
  'utils.removeContentHeaders: this private api moved with serve-static');

/**
 * Check if `req` is a conditional GET request.
 *
 * @param {IncomingMessage} req
 * @return {Boolean}
 * @api private
 */

exports.conditionalGET = function(req) {
  return req.headers['if-modified-since']
    || req.headers['if-none-match'];
};

exports.conditionalGET = deprecate.function(exports.conditionalGET,
  'utils.conditionalGET: use fresh npm module instead');

/**
 * Respond with 401 "Unauthorized".
 *
 * @param {ServerResponse} res
 * @param {String} realm
 * @api private
 */

exports.unauthorized = function(res, realm) {
  res.statusCode = 401;
  res.setHeader('WWW-Authenticate', 'Basic realm="' + realm + '"');
  res.end('Unauthorized');
};

exports.unauthorized = deprecate.function(exports.unauthorized,
  'utils.unauthorized: this private api moved with basic-auth-connect');

/**
 * Respond with 304 "Not Modified".
 *
 * @param {ServerResponse} res
 * @param {Object} headers
 * @api private
 */

exports.notModified = function(res) {
  exports.removeContentHeaders(res);
  res.statusCode = 304;
  res.end();
};

exports.notModified = deprecate.function(exports.notModified,
  'utils.notModified: this private api moved with serve-static');

/**
 * Return an ETag in the form of `"<size>-<mtime>"`
 * from the given `stat`.
 *
 * @param {Object} stat
 * @return {String}
 * @api private
 */

exports.etag = function(stat) {
  return '"' + stat.size + '-' + Number(stat.mtime) + '"';
};

exports.etag = deprecate.function(exports.etag,
  'utils.etag: this private api moved with serve-static');

/**
 * Parse the given Cache-Control `str`.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

exports.parseCacheControl = function(str){
  var directives = str.split(',')
    , obj = {};

  for(var i = 0, len = directives.length; i < len; i++) {
    var parts = directives[i].split('=')
      , key = parts.shift().trim()
      , val = parseInt(parts.shift(), 10);

    obj[key] = isNaN(val) ? true : val;
  }

  return obj;
};

/**
 * Parse the `req` url with memoization.
 *
 * @param {ServerRequest} req
 * @return {Object}
 * @api private
 */

exports.parseUrl = deprecate.function(parseurl,
  'utils.parseUrl: use parseurl npm module instead');

/**
 * Parse byte `size` string.
 *
 * @param {String} size
 * @return {Number}
 * @api private
 */

exports.parseBytes = deprecate.function(bytes,
  'utils.parseBytes: use bytes npm module instead');

/**
 * Normalizes the path separator from system separator
 * to URL separator, aka `/`.
 *
 * @param {String} path
 * @return {String}
 * @api private
 */

exports.normalizeSlashes = function normalizeSlashes(path) {
  return path.split(sep).join('/');
};

exports.normalizeSlashes = deprecate.function(exports.normalizeSlashes,
  'utils.normalizeSlashes: this private api moved with serve-index');

/**
 * Set the charset in a given Content-Type string if none exists.
 *
 * @param {String} type
 * @param {String} charset
 * @return {String}
 * @api private
 */

exports.setCharset = function(type, charset){
  if (!type || !charset) return type;

  var parsed = typer.parse(type);
  var exists = parsed.parameters.charset;

  // keep existing charset
  if (exists) {
    return type;
  }

  // set charset
  parsed.parameters.charset = charset;

  return typer.format(parsed);
};

function noop() {}
