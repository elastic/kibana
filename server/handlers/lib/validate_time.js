var parseDateMath = require('../../lib/date_math.js');
var toMS = require('../../lib/to_milliseconds.js');

module.exports = function validateTime(time, tlConfig) {
  var span = parseDateMath(time.to, true) - parseDateMath(time.from);
  var interval = toMS(time.interval);
  var bucketCount = span / interval;
  if (bucketCount > tlConfig.file.max_buckets) {
    throw new Error('Max buckets exceeded: ' +
      Math.round(bucketCount) + ' of ' + tlConfig.file.max_buckets + ' allowed. ' +
      'Choose a larger interval or a shorter time span');
  }
  return true;
};