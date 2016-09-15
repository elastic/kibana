var _ = require('lodash');
var moment = require('moment');

// Upsampling of non-cummulative sets
// Good: average, min, max
// Bad: sum, count

// Don't use this to down sample, it simply won't do the right thing.
module.exports = function (dataTuples, targetTuples) {

  if (dataTuples.length > targetTuples.length) {
    throw new Error (`Don't use the 'carry' fit method to down sample, use 'scale' or 'average'`);
  }

  var currentCarry = dataTuples[0][1];
  return _.map(targetTuples, function (bucket, h) {
    var targetTime = bucket[0];
    var dataTime = dataTuples[0][0];

    if (dataTuples[0] && targetTime >= dataTime) {
      currentCarry = dataTuples[0][1];
      if (dataTuples.length > 1) { dataTuples.shift(); }
    }

    return [bucket[0], currentCarry];
  });
};
