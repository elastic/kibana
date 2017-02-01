let parseDateMath = require('../../lib/date_math.js');
let toMS = require('../../lib/to_milliseconds.js');

module.exports = function validateTime(time, tlConfig) {
  let span = parseDateMath(time.to, true) - parseDateMath(time.from);
  let interval = toMS(time.interval);
  let bucketCount = span / interval;
  let maxBuckets = tlConfig.settings['timelion:max_buckets'];
  if (bucketCount > maxBuckets) {
    throw new Error('Max buckets exceeded: ' +
      Math.round(bucketCount) + ' of ' + maxBuckets + ' allowed. ' +
      'Choose a larger interval or a shorter time span');
  }
  return true;
};
