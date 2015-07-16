var reduce = require('../utils/reduce.js');

module.exports = function divide (args) {
  return reduce(args, function (a, b) {
    return a / b;
  });
};
