import calculateAuto from './calculate_auto';
import moment from 'moment';
import unitToSeconds from './unit_to_seconds';
export default (req, interval) => {
  const from = moment.utc(req.payload.timerange.min);
  const to = moment.utc(req.payload.timerange.max);
  const duration = moment.duration(to.valueOf() - from.valueOf(), 'ms');
  let bucketSize = calculateAuto.near(100, duration).asSeconds();
  if (bucketSize < 1) bucketSize = 1; // don't go too small
  let intervalString = `${bucketSize}s`;

  const matches = interval && interval.match(/^([\d]+)([shmdwMy]|ms)$/);
  if (matches) {
    bucketSize = Number(matches[1]) * unitToSeconds(matches[2]);
    intervalString = interval;
  }

  return { bucketSize, intervalString };
};
