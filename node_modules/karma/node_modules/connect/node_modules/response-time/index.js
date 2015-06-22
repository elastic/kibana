/*!
 * response-time
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var onHeaders = require('on-headers')

/**
 * Reponse time:
 *
 * Adds the `X-Response-Time` header displaying the response
 * duration in milliseconds.
 *
 * @param {number} [digits=3]
 * @return {function}
 * @api public
 */

module.exports = function responseTime(digits) {
  digits = digits === undefined
    ? 3
    : digits

  return function responseTime(req, res, next) {
    var startAt = process.hrtime()

    onHeaders(res, function () {
      if (this.getHeader('X-Response-Time')) return;

      var diff = process.hrtime(startAt)
      var ms = diff[0] * 1e3 + diff[1] * 1e-6

      this.setHeader('X-Response-Time', ms.toFixed(digits) + 'ms')
    })

    next()
  }
}
