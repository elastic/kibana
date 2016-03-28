"use strict";

/*!
 * knox - auth
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var crypto = require('crypto')
  , parse = require('url').parse;

/**
 * Query string params permitted in the canonicalized resource.
 * @see http://docs.amazonwebservices.com/AmazonS3/latest/dev/RESTAuthentication.html#ConstructingTheCanonicalizedResourceElement
 */

var whitelist = [
    'acl'
  , 'delete'
  , 'lifecycle'
  , 'location'
  , 'logging'
  , 'notification'
  , 'partNumber'
  , 'policy'
  , 'requestPayment'
  , 'torrent'
  , 'uploadId'
  , 'uploads'
  , 'versionId'
  , 'versioning'
  , 'versions'
  , 'website'
];

/**
 * Return an "Authorization" header value with the given `options`
 * in the form of "AWS <key>:<signature>"
 *
 * @param {Object} options
 * @return {String}
 * @api private
 */

exports.authorization = function(options){
  return 'AWS ' + options.key + ':' + exports.sign(options);
};

/**
 * Simple HMAC-SHA1 Wrapper
 *
 * @param {Object} options
 * @return {String}
 * @api private
 */

exports.hmacSha1 = function(options){
  return crypto.createHmac('sha1', options.secret).update(new Buffer(options.message, 'utf-8')).digest('base64');
};

/**
 * Create a base64 sha1 HMAC for `options`.
 *
 * @param {Object} options
 * @return {String}
 * @api private
 */

exports.sign = function(options){
  options.message = exports.stringToSign(options);
  return exports.hmacSha1(options);
};

/**
 * Create a base64 sha1 HMAC for `options`.
 *
 * Specifically to be used with S3 presigned URLs
 *
 * @param {Object} options
 * @return {String}
 * @api private
 */

exports.signQuery = function(options){
  options.message = exports.queryStringToSign(options);
  return exports.hmacSha1(options);
};

/**
 * Return a string for sign() with the given `options`.
 *
 * Spec:
 *
 *    <verb>\n
 *    <md5>\n
 *    <content-type>\n
 *    <date>\n
 *    [headers\n]
 *    <resource>
 *
 * @param {Object} options
 * @return {String}
 * @api private
 */

exports.stringToSign = function(options){
  var headers = options.amazonHeaders || '';
  if (headers) headers += '\n';
  return [
      options.verb
    , options.md5
    , options.contentType
    , options.date instanceof Date ? options.date.toUTCString() : options.date
    , headers + options.resource
  ].join('\n');
};

/**
 * Return a string for sign() with the given `options`, but is meant exclusively
 * for S3 presigned URLs
 *
 * Spec:
 *
 *    <verb>\n\n
 *    <contentType or nothing>\n
 *    <date>\n
 *    <x-amz-security-token header>\n --- optional
 *    <resource>
 *
 * @param {Object} options
 * @return {String}
 * @api private
 */

exports.queryStringToSign = function(options){
  return (options.verb || 'GET') + '\n\n' +
    (typeof options.contentType !== 'undefined' ?
      options.contentType : '') + '\n' +
    options.date + '\n' +
    (typeof options.token !== 'undefined' ?
      'x-amz-security-token:' + options.token + '\n' : '') +
    options.resource;
};

/**
 * Perform the following:
 *
 *  - ignore non-amazon headers
 *  - lowercase fields
 *  - sort lexicographically
 *  - trim whitespace between ":"
 *  - join with newline
 *
 * @param {Object} headers
 * @return {String}
 * @api private
 */

exports.canonicalizeHeaders = function(headers){
  var buf = []
    , fields = Object.keys(headers);
  for (var i = 0, len = fields.length; i < len; ++i) {
    var field = fields[i]
      , val = headers[field];

    field = field.toLowerCase();

    if (field.indexOf('x-amz') !== 0 || field === 'x-amz-date') {
      continue;
    }

    buf.push(field + ':' + val);
  }

  var headerSort = function(a, b) {
    // Headers are sorted lexigraphically based on the header name only.
    a = a.split(":")[0]
    b = b.split(":")[0]

    return a > b ? 1 : -1;
  }
  return buf.sort(headerSort).join('\n');
};

/**
 * Perform the following:
 *
 *  - ignore non sub-resources
 *  - sort lexicographically
 *
 * @param {String} a URI-encoded resource (path + query string)
 * @return {String}
 * @api private
 */

exports.canonicalizeResource = function(resource){
  var url = parse(resource, true)
    , path = url.pathname
    , buf = [];

  // apply the query string whitelist
  Object.keys(url.query).forEach(function (key) {
      if (whitelist.indexOf(key) != -1) {
          buf.push(key + (url.query[key] ? "=" + url.query[key] : ''));
      }
  });

  return path + (buf.length
    ? '?' + buf.sort().join('&')
    : '');
};
