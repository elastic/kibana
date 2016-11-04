let _ = require('lodash');
let unzipPairs = require('./unzipPairs.js');

module.exports = function asSorted(timeValObject, fn) {
  let data = unzipPairs(timeValObject);
  return _.zipObject(fn(data));
};
