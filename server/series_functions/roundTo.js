var reduce = require('../utils/reduce.js');

module.exports = function roundTo (args) {
  return reduce(args, function (a, b) {
    return parseInt(a * Math.pow(10, b), 10) / Math.pow(10, b);
  });
};
