var Stochator = require('./stochator');
var roundAllGets = require('./round_all_gets');

var ext = {
  php: roundAllGets(new Stochator({
    mean: 1500,
    stddev: 4500 * 0.56,
    min: 50,
    max: 10000
  }, 'get')),
  png: roundAllGets(new Stochator({
    mean: 14500,
    stddev: 14500 * 0.56,
    min: 1500,
    max: 20000
  }, 'get')),
  gif: roundAllGets(new Stochator({
    mean: 170000,
    min: 1000
  }, 'get')),
  default: roundAllGets(new Stochator({
    mean: 4500,
    stddev: 4500 * 0.56,
    min: 1500,
    max: 10000
  }, 'get'))
};

module.exports = function (extension) {
  if (ext[extension]) {
    return ext[extension].get();
  }

  return ext.default.get();
};