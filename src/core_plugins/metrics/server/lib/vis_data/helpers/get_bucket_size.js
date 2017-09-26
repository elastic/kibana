import calculateAuto from './calculate_auto';
import moment from 'moment';
import unitToSeconds from './unit_to_seconds';
export default (req, interval, minInterval) => {
  const from = moment.utc(req.payload.timerange.min);
  const to = moment.utc(req.payload.timerange.max);
  const duration = moment.duration(to.valueOf() - from.valueOf(), 'ms');
  let bucketSize = calculateAuto.near(100, duration).asSeconds();
  if (bucketSize < 1) bucketSize = 1; // don't go too small
  let intervalString = `${bucketSize}s`; // set auto interval

  // set manual interval if defined
  const matches = interval && interval.match(/^([\d]+)([shmdwMy]|ms)$/);
  if (matches) {
    bucketSize = Number(matches[1]) * unitToSeconds(matches[2]);
    intervalString = interval;
  } else {
    // if auto interval, make sure we're above the minimum
    const minBucketMatches = minInterval && minInterval.match(/^([\d]+)([shmdwMy]|ms)$/);
    if (minBucketMatches) {
      const minBucketSize = Number(minBucketMatches[1]) * unitToSeconds(minBucketMatches[2]);
      if (minBucketSize > bucketSize) {
        bucketSize = minBucketSize;
        intervalString = minInterval;
      }
    }
  }

  return { bucketSize, intervalString };
};
