var _ = require('lodash');
var moment = require('moment');

// Upsampling and downsampling of non-cummulative sets
// Good: average, min, max
// Bad: sum, count
module.exports = function (dataTuples, targetTuples) {

  var currentCarry = dataTuples[0][1];
  return _.map(targetTuples, function (bucket, h) {
    var time = bucket[0];

    if (dataTuples[0] && time > dataTuples[0][0]) {
      currentCarry = dataTuples[0][1];
      dataTuples.shift();
    }

    return [bucket[0], currentCarry];
  });
};
