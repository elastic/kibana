import calculateAuto from './calculate_auto';
import moment from 'moment';
import unitToSeconds from './unit_to_seconds';
import {
  INTERVAL_STRING_RE,
  GTE_INTERVAL_RE
} from '../../../../common/interval_regexp';
export default (req, interval) => {
  const from = moment.utc(req.payload.timerange.min);
  const to = moment.utc(req.payload.timerange.max);
  const duration = moment.duration(to.valueOf() - from.valueOf(), 'ms');
  let bucketSize = calculateAuto.near(100, duration).asSeconds();
  if (bucketSize < 1) bucketSize = 1; // don't go too small
  let intervalString = `${bucketSize}s`;

  const gteAutoMatch = interval && interval.match(GTE_INTERVAL_RE);
  if (gteAutoMatch) {
    const intervalStringMatch = gteAutoMatch[1].match(INTERVAL_STRING_RE);
    const gteBucketSize = Number(intervalStringMatch[1]) * unitToSeconds(intervalStringMatch[2]);
    if (gteBucketSize >= bucketSize) {
      return {
        bucketSize: gteBucketSize,
        intervalString: gteAutoMatch[1]
      };
    }
  }

  const matches = interval && interval.match(INTERVAL_STRING_RE);
  if (matches) {
    bucketSize = Number(matches[1]) * unitToSeconds(matches[2]);
    intervalString = interval;
  }

  return { bucketSize, intervalString };
};
