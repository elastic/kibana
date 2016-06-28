"use strict";

/*!
 * knox - utils
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Merge object `b` with object `a`.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function(a, b){
  var keys = Object.keys(b);
  for (var i = 0, len = keys.length; i < len; ++i) {
    var key = keys[i];
    a[key] = b[key]
  }
  return a;
};

/**
 * Base64.
 */

exports.base64 = {

  /**
   * Base64 encode the given `str`.
   *
   * @param {String} str
   * @return {String}
   * @api private
   */

  encode: function(str){
    return new Buffer(str).toString('base64');
  },

  /**
   * Base64 decode the given `str`.
   *
   * @param {String} str
   * @return {String}
   * @api private
   */

  decode: function(str){
    return new Buffer(str, 'base64').toString();
  }
};
