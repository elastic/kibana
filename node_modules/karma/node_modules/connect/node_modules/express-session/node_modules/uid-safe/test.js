
var assert = require('assert')

var uid = require('./')

describe('uid-url', function () {
  describe('uid()', function () {
    it('should return a uid of the correct length', function () {
      return uid(18).then(function (val) {
        assert.equal(24, Buffer.byteLength(val))
      })
    })

    it('should not contain +, /, or =', function () {
      return uid(100000).then(function (val) {
        assert(!~val.indexOf('+'))
        assert(!~val.indexOf('/'))
        assert(!~val.indexOf('='))
      })
    })

    it('should support callbacks', function (done) {
      uid(1000000, function (err, val) {
        if (err) return done(err)
        assert(!~val.indexOf('+'))
        assert(!~val.indexOf('/'))
        assert(!~val.indexOf('='))
        done()
      })
    })
  })

  describe('uid.sync()', function () {
    it('should return a uid of the correct length', function () {
      var val = uid.sync(18)
      assert.equal(24, Buffer.byteLength(val))
    })

    it('should not contain +, /, or =', function () {
      var val = uid.sync(100000)
      assert(!~val.indexOf('+'))
      assert(!~val.indexOf('/'))
      assert(!~val.indexOf('='))
    })
  })
})
