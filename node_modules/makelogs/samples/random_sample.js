/**
 * @class RandomList
 */

var _ = require('lodash');

module.exports = RandomSample;

function RandomSample(min, max, list) {
  min = Math.max(min, 0);
  max = Math.min(max, _.size(list));

  this.get = function () {
    var n = _.random(min, max);
    var i = 0;
    var sample = [];

    makeSample:
    while (i < n) {
      var s = _.sample(list);
      for (var c = 0; c < i; c++) {
        if (sample[c] === s) continue makeSample;
      }

      sample[i] = s;
      i++;
    }

    return sample;
  };
}
