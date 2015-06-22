module.exports = once

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return
    f.called = true
    return fn.apply(this, arguments)
  }
  f.called = false
  return f
}
