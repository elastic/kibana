/*!
 * etag
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module exports.
 */

module.exports = etag

/**
 * Module dependencies.
 */

var crc = require('crc').crc32
var crypto = require('crypto')
var Stats = require('fs').Stats

/**
 * Module variables.
 */

var crc32threshold = 1000 // 1KB
var NULL = new Buffer([0])
var toString = Object.prototype.toString

/**
 * Create a simple ETag.
 *
 * @param {string|Buffer|Stats} entity
 * @param {object} [options]
 * @param {boolean} [options.weak]
 * @return {String}
 * @api public
 */

function etag(entity, options) {
  if (entity == null) {
    throw new TypeError('argument entity is required')
  }

  var isBuffer = Buffer.isBuffer(entity)
  var isStats = isstats(entity)
  var weak = options && typeof options.weak === 'boolean'
    ? options.weak
    : isStats

  // support fs.Stats object
  if (isStats) {
    return stattag(entity, weak)
  }

  if (!isBuffer && typeof entity !== 'string') {
    throw new TypeError('argument entity must be string, Buffer, or fs.Stats')
  }

  var buf = !isBuffer
    ? new Buffer(entity, 'utf8')
    : entity
  var hash = weak && buf.length <= crc32threshold
    ? weakhash(buf)
    : stronghash(buf)

  return weak
    ? 'W/"' + hash + '"'
    : '"' + hash + '"'
}

/**
 * Determine if object is a Stats object.
 *
 * @param {object} obj
 * @return {boolean}
 * @api private
 */

function isstats(obj) {
  // not even an object
  if (obj === null || typeof obj !== 'object') {
    return false
  }

  // genuine fs.Stats
  if (obj instanceof Stats) {
    return true
  }

  // quack quack
  return 'atime' in obj && toString.call(obj.atime) === '[object Date]'
    && 'ctime' in obj && toString.call(obj.ctime) === '[object Date]'
    && 'mtime' in obj && toString.call(obj.mtime) === '[object Date]'
    && 'ino' in obj && typeof obj.ino === 'number'
    && 'size' in obj && typeof obj.size === 'number'
}

/**
 * Generate a tag for a stat.
 *
 * @param {Buffer} entity
 * @return {String}
 * @api private
 */

function stattag(stat, weak) {
  var mtime = stat.mtime.toISOString()
  var size = stat.size.toString(16)

  if (weak) {
    return 'W/"' + size + '-' + crc(mtime) + '"'
  }

  var hash = crypto
    .createHash('md5')
    .update('file', 'utf8')
    .update(NULL)
    .update(size, 'utf8')
    .update(NULL)
    .update(mtime, 'utf8')
    .digest('base64')

  return '"' + hash + '"'
}

/**
 * Generate a strong hash.
 *
 * @param {Buffer} entity
 * @return {String}
 * @api private
 */

function stronghash(buf) {
  if (buf.length === 0) {
    // fast-path empty
    return '1B2M2Y8AsgTpgAmY7PhCfg=='
  }

  return crypto
    .createHash('md5')
    .update(buf)
    .digest('base64')
}

/**
 * Generate a weak hash.
 *
 * @param {Buffer} entity
 * @return {String}
 * @api private
 */

function weakhash(buf) {
  if (buf.length === 0) {
    // fast-path empty
    return '0-0'
  }

  return buf.length.toString(16) + '-' + crc(buf).toString(16)
}
