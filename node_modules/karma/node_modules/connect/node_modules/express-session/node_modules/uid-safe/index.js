
var pseudoRandomBytes = require('crypto').pseudoRandomBytes
var escape = require('base64-url').escape

var pseudoRandomBytesProm

module.exports = uid

function uid(length, cb) {
  if (cb) {
    return pseudoRandomBytes(length, function (err, buf) {
      if (err) return cb(err)
      cb(null, escapeBuffer(buf))
    })
  }

  pseudoRandomBytesProm || (pseudoRandomBytesProm = require('mz/crypto').pseudoRandomBytes)
  return pseudoRandomBytesProm(length).then(escapeBuffer)
}

uid.sync = function uid_sync(length) {
  return escapeBuffer(pseudoRandomBytes(length))
}

function escapeBuffer(buf) {
  return escape(buf.toString('base64'))
}
