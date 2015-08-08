var _ = require('lodash');

// Upsampling and downsampling of non-cummulative sets
// Good: average, min, max
// Bad: sum, count
module.exports = function (dataTuples, targetTuples) {
  return _.map(targetTuples, function (bucket) {
    var time = bucket[0];
    var i = 0;
    while (i < dataTuples.length-1 && Math.abs(dataTuples[i + 1][0] - time) < Math.abs(dataTuples[i][0] - time)) {
      i++;
    }

    var closest = dataTuples[i];
    dataTuples.splice(0, i);


    return [bucket[0], closest[1]];
  });
};