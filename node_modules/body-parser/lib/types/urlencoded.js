/*!
 * body-parser
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var bytes = require('bytes')
var contentType = require('content-type')
var debug = require('debug')('body-parser:urlencoded')
var deprecate = require('depd')('body-parser')
var read = require('../read')
var typeis = require('type-is')

/**
 * Module exports.
 */

module.exports = urlencoded

/**
 * Cache of parser modules.
 */

var parsers = Object.create(null)

/**
 * Create a middleware to parse urlencoded bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @api public
 */

function urlencoded(options){
  options = options || {};

  // notice because option default will flip in next major
  if (options.extended === undefined) {
    deprecate('undefined extended: provide extended option')
  }

  var extended = options.extended !== false
  var inflate = options.inflate !== false
  var limit = typeof options.limit !== 'number'
    ? bytes(options.limit || '100kb')
    : options.limit
  var type = options.type || 'urlencoded'
  var verify = options.verify || false

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function')
  }

  // create the appropriate query parser
  var queryparse = extended
    ? extendedparser(options)
    : simpleparser(options)

  // create the appropriate type checking function
  var shouldParse = typeof type !== 'function'
    ? typeChecker(type)
    : type

  function parse(body) {
    return body.length
      ? queryparse(body)
      : {}
  }

  return function urlencodedParser(req, res, next) {
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

    // assert charset
    var charset = getCharset(req) || 'utf-8'
    if (charset !== 'utf-8') {
      var err = new Error('unsupported charset "' + charset.toUpperCase() + '"')
      err.charset = charset
      err.status = 415
      return debug('invalid charset'), next(err)
    }

    // read
    read(req, res, next, parse, debug, {
      debug: debug,
      encoding: charset,
      inflate: inflate,
      limit: limit,
      verify: verify
    })
  }
}

/**
 * Get the extended query parser.
 *
 * @param {object} options
 */

function extendedparser(options) {
  var parameterLimit = options.parameterLimit !== undefined
    ? options.parameterLimit
    : 1000
  var parse = parser('qs')

  if (isNaN(parameterLimit) || parameterLimit < 1) {
    throw new TypeError('option parameterLimit must be a positive number')
  }

  if (isFinite(parameterLimit)) {
    parameterLimit = parameterLimit | 0
  }

  return function queryparse(body) {
    var paramCount = parameterCount(body, parameterLimit)

    if (paramCount === undefined) {
      var err = new Error('too many parameters')
      err.status = 413
      debug('too many parameters')
      throw err
    }

    var arrayLimit = Math.max(100, paramCount)

    debug('parse extended urlencoding')
    return parse(body, {
      arrayLimit: arrayLimit,
      depth: Infinity,
      parameterLimit: parameterLimit
    })
  }
}

/**
 * Get the charset of a request.
 *
 * @param {object} req
 * @api private
 */

function getCharset(req) {
  try {
    return contentType.parse(req).parameters.charset.toLowerCase()
  } catch (e) {
    return undefined
  }
}

/**
 * Count the number of parameters, stopping once limit reached
 *
 * @param {string} body
 * @param {number} limit
 * @api private
 */

function parameterCount(body, limit) {
  var count = 0
  var index = 0

  while ((index = body.indexOf('&', index)) !== -1) {
    count++
    index++

    if (count === limit) {
      return undefined
    }
  }

  return count
}

/**
 * Get parser for module name dynamically.
 *
 * @param {string} name
 * @return {function}
 * @api private
 */

function parser(name) {
  var mod = parsers[name]

  if (mod) {
    return mod.parse
  }

  // load module
  mod = parsers[name] = require(name)

  return mod.parse
}

/**
 * Get the simple query parser.
 *
 * @param {object} options
 */

function simpleparser(options) {
  var parameterLimit = options.parameterLimit !== undefined
    ? options.parameterLimit
    : 1000
  var parse = parser('querystring')

  if (isNaN(parameterLimit) || parameterLimit < 1) {
    throw new TypeError('option parameterLimit must be a positive number')
  }

  if (isFinite(parameterLimit)) {
    parameterLimit = parameterLimit | 0
  }

  return function queryparse(body) {
    var paramCount = parameterCount(body, parameterLimit)

    if (paramCount === undefined) {
      var err = new Error('too many parameters')
      err.status = 413
      debug('too many parameters')
      throw err
    }

    debug('parse urlencoding')
    return parse(body, undefined, undefined, {maxKeys: parameterLimit})
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
