
var rndm = require('rndm')
var scmp = require('scmp')
var uid = require('uid-safe')
var crypto = require('crypto')
var escape = require('base64-url').escape

module.exports = csrfTokens

function csrfTokens(options) {
  options = options || {}

  // adjustable lengths
  var secretLength = options.secretLength || 18 // the longer the better
  var saltLength = options.saltLength || 8 // doesn't need to be long

  // convert a secret + a salt to a token
  // this does NOT have to be cryptographically secure, so we don't use HMAC,
  // and we use sha1 because sha256 is unnecessarily long for cookies and stuff
  var tokenize = options.tokenize || csrfTokens.tokenize

  return {
    // create a secret key
    // this __should__ be cryptographically secure,
    // but generally client's can't/shouldn't-be-able-to access this so it really doesn't matter.
    secret: function secret(cb) {
      return uid(secretLength, cb)
    },

    // a sync version of secret()
    secretSync: function secretSync() {
      return uid.sync(secretLength)
    },

    // create a csrf token
    create: function create(secret) {
      return tokenize(secret, rndm(saltLength))
    },

    // verify whether a token is valid
    verify: function verify(secret, token) {
      if (!secret || typeof secret !== 'string') {
        return false
      }

      if (!token || typeof token !== 'string') {
        return false
      }

      var index = token.indexOf('-')

      if (index === -1) {
        return false
      }

      var salt = token.substr(0, index)
      var expected = tokenize(secret, salt)

      return scmp(token, expected)
    },
  }
}

csrfTokens.tokenize = function tokenize(secret, salt) {
  var hash = escape(crypto
    .createHash('sha1')
    .update(salt)
    .update('-')
    .update(secret)
    .digest('base64'))
  return salt + '-' + hash
}
