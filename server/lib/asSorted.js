var _ = require('lodash');
var unzipPairs = require('./unzipPairs.js');

module.exports = function asSorted(timeValObject, fn) {
  var data = unzipPairs(timeValObject);
  return _.zipObject(fn(data));
};
