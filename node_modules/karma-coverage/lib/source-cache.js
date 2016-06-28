// Source Cache
// ============

var cache = {}

function get (basePath) {
  if (!cache[basePath]) {
    cache[basePath] = {}
  }

  return cache[basePath]
}

module.exports = {
  get: get
}
