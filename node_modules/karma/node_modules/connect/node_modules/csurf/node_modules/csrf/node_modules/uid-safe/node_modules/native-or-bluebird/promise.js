
module.exports = global.Promise

if (!module.exports) {
  try {
    module.exports = require('bluebird')
  } catch (_) {}
}
