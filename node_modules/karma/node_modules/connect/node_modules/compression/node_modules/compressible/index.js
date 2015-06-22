/*!
 * compressible
 * Copyright(c) 2014 Jeremiah Senkpiel
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var db = require('mime-db')

/**
 * Module exports.
 */

module.exports = compressible

/**
 * Checks if a type is compressible.
 *
 * @param {string} type
 * @return {Boolean} compressible
 */

function compressible(type) {
  if (!type || typeof type !== "string") return false

  // Strip charset
  var i = type.indexOf(';')
  if (~i) type = type.slice(0, i)

  // handle types that have capitals or excess space
  type = type.trim().toLowerCase()
  
  // attempt to look up from database; fallback to regex if not found
  var mime = db[type]
  return mime ? mime.compressible : /^text\/|\+json$|\+text$|\+xml$/.test(type)
}
