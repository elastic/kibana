var reduce = require('../utils/reduce.js');


module.exports = function subtract (args) {
  return reduce(args, function (a, b) {
    return a - b;
  });
};
