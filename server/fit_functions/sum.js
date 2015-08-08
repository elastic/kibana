var _ = require('lodash');

// Downsampling of cummulative metrics
// Good: count, sum
// Bad: avg, min, max


// For upsampling cummulative metrics (eg sum from 1M to 1d), could rename this scale.
// Really only the 0s that screws this up, need to distribute contents of spikes to empty buckets
// Empty is currently 0, which is not right
module.exports = function (dataTuples, targetTuples) {
  return _.map(targetTuples, function (bucket) {
    var time = bucket[0];
    var i = 0;
    var avgSet = [];
    while (i < dataTuples.length && Math.abs(dataTuples[i][0] <= time)) {
      avgSet.push(dataTuples[i][1]);
      i++;
    }

    dataTuples.splice(0, i);

    var sum = _.reduce(avgSet, function(sum, num) { return sum + num; }, 0);

    return [bucket[0], (sum)];
  });
};