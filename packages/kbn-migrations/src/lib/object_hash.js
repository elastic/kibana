const fullHash = require('object-hash');

module.exports = function objectHash(obj) {
  return fullHash(obj).slice(0, 8);
};
