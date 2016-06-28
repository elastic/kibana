// Coverage Map
// ============

var coverageMap = {}

function add (coverageObj) {
  coverageMap[coverageObj.path] = coverageObj
}

function get () {
  return coverageMap
}

function reset () {
  coverageMap = {}
}

module.exports = {
  add: add,
  get: get,
  reset: reset
}
