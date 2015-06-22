/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var bytes = require('bytes')
var debug = require('debug')('body-parser:raw')
var read = require('../read')
var typeis = require('type-is')

/**
 * Module exports.
 */

module.exports = raw

/**
 * Create a middleware to parse raw bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @api public
 */

function raw(options) {
  options = options || {};

  var inflate = options.inflate !== false
  var limit = typeof options.limit !== 'number'
    ? bytes(options.limit || '100kb')
    : options.limit
  var type = options.type || 'application/octet-stream'
  var verify = options.verify || false

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function')
  }

  // create the appropriate type checking function
  var shouldParse = typeof type !== 'function'
    ? typeChecker(type)
    : type

  function parse(buf) {
    return buf
  }

  return function rawParser(req, res, next) {
    if (req._body) {
      return debug('body already parsed'), next()
    }

    req.body = req.body || {}

    // skip requests without bodies
    if (!typeis.hasBody(req)) {
      return debug('skip empty body'), next()
    }

    debug('content-type %s', JSON.stringify(req.headers['content-type']))

    // determine if request should be parsed
    if (!shouldParse(req)) {
      return debug('skip parsing'), next()
    }

    // read
    read(req, res, next, parse, debug, {
      encoding: null,
      inflate: inflate,
      limit: limit,
      verify: verify
    })
  }
}

/**
 * Get the simple type checker.
 *
 * @param {string} type
 * @return {function}
 */

function typeChecker(type) {
  return function checkType(req) {
    return Boolean(typeis(req, type))
  }
}
