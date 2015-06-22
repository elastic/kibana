
/*!
 * Connect
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var cookie = require('cookie');
var deprecate = require('depd')('connect');
var http = require('http');
var onHeaders = require('on-headers');
var utils = require('./utils')
  , res = http.ServerResponse.prototype
  , addListener = res.addListener
  , setHeader = res.setHeader;

// apply only once

if (!res._hasConnectPatch) {

  /**
   * Provide a public "header sent" flag
   * until node does.
   *
   * @return {Boolean}
   * @api public
   */

  Object.defineProperty(res, 'headerSent', {
    configurable: true,
    enumerable: true,
    get: headersSent
  });

  deprecate.property(res, 'headerSent', 'res.headerSent: use standard res.headersSent');

  if (!('headersSent' in res)) {

    /**
     * Provide the public "header sent" flag
     * added in node.js 0.10.
     *
     * @return {Boolean}
     * @api public
     */

    Object.defineProperty(res, 'headersSent', {
      configurable: true,
      enumerable: true,
      get: headersSent
    });

  }

  /**
   * Set cookie `name` to `val`, with the given `options`.
   *
   * Options:
   *
   *    - `maxAge`   max-age in milliseconds, converted to `expires`
   *    - `path`     defaults to "/"
   *
   * @param {String} name
   * @param {String} val
   * @param {Object} options
   * @api public
   */

  res.cookie = function(name, val, options){
    options = utils.merge({}, options);
    if ('maxAge' in options) {
      options.expires = new Date(Date.now() + options.maxAge);
      options.maxAge /= 1000;
    }
    if (null == options.path) options.path = '/';
    this.setHeader('Set-Cookie', cookie.serialize(name, String(val), options));
  };

  /**
   * Append additional header `field` with value `val`.
   *
   * @param {String} field
   * @param {String} val
   * @api public
   */

  res.appendHeader = function appendHeader(field, val){
    var prev = this.getHeader(field);

    if (!prev) return setHeader.call(this, field, val);

    // concat the new and prev vals
    val = Array.isArray(prev) ? prev.concat(val)
      : Array.isArray(val) ? [prev].concat(val)
      : [prev, val];

    return setHeader.call(this, field, val);
  };

  /**
   * Set header `field` to `val`, special-casing
   * the `Set-Cookie` field for multiple support.
   *
   * @param {String} field
   * @param {String} val
   * @api public
   */

  res.setHeader = function(field, val){
    var key = field.toLowerCase()
      , prev;

    // special-case Set-Cookie
    if (key === 'set-cookie') {
      // detect code doing getHeader -> setHeader
      if (Array.isArray(val) && val.length > 1) {
        prev = [].concat(this.getHeader(field) || []);
        val = unique(prev, val);
      }

      return this.appendHeader(field, val);
    }

    // charset
    if ('content-type' == key && this.charset) {
      val = utils.setCharset(val, this.charset, true);
    }

    return setHeader.call(this, field, val);
  };

  /**
   * Proxy to emit "header" event.
   */

  res.on = function(type, listener){
    if (type === 'header') {
      deprecate('res.on("header"): use on-headers npm module instead');
      onHeaders(this, listener);
      return this;
    }

    return addListener.apply(this, arguments);
  };

  res._hasConnectPatch = true;
}

/**
 * Determine if headers sent.
 *
 * @return {Boolean}
 * @api private
 */

function headersSent(){
  return Boolean(this._header);
}

/**
 * Get unique elements in arr that are not in reference.
 *
 * @param {array} reference
 * @param {array} arr
 * @return {array}
 * @api private
 */

function unique(reference, arr){
  var array = [];

  for (var i = 0; i < arr.length; i++) {
    if (reference.indexOf(arr[i]) === -1) {
      array.push(arr[i]);
    }
  }

  return array;
}
