module.exports = function (stream, done) {
  if (!stream) {
    // no arguments, meaning stream = this
    stream = this
  } else if (typeof stream === 'function') {
    // stream = this, callback passed
    done = stream
    stream = this
  }

  // if stream is already ended,
  // return an array
  if (!stream.readable) {
    process.nextTick(function () {
      done(null, [])
    })
    return defer
  }

  var arr = []

  stream.on('data', onData)
  stream.once('end', onEnd)
  stream.once('error', onEnd)
  stream.once('close', cleanup)

  return defer

  function defer(fn) {
    done = fn
  }

  function onData(doc) {
    arr.push(doc)
  }

  function onEnd(err) {
    done(err, arr)
    cleanup()
  }

  function cleanup() {
    arr = null
    stream.removeListener('data', onData)
    stream.removeListener('end', onEnd)
    stream.removeListener('error', onEnd)
    stream.removeListener('close', cleanup)
  }
}