import parseDateMath from '../../lib/date_math.js';
import toMS from '../../lib/to_milliseconds.js';

module.exports = function validateTime(time, tlConfig) {
  const span = parseDateMath(time.to, true) - parseDateMath(time.from);
  const interval = toMS(time.interval);
  const bucketCount = span / interval;
  const maxBuckets = tlConfig.settings['timelion:max_buckets'];
  if (bucketCount > maxBuckets) {
    throw new Error('Max buckets exceeded: ' +
      Math.round(bucketCount) + ' of ' + maxBuckets + ' allowed. ' +
      'Choose a larger interval or a shorter time span');
  }
  return true;
};
