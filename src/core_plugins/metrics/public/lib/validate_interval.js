import { parseInterval } from 'ui/utils/parse_interval';
import { GTE_INTERVAL_RE } from '../../common/interval_regexp';
export function validateInterval(bounds, panel, maxBuckets) {
  const { interval } = panel;
  const { min, max } = bounds;
  // No need to check auto it will return around 100
  if (!interval) return;
  if (interval === 'auto') return;
  const greaterThanMatch = interval.match(GTE_INTERVAL_RE);
  if (greaterThanMatch) return;
  const duration = parseInterval(interval);
  if (duration) {
    const span = max.valueOf() - min.valueOf();
    const buckets = Math.floor(span / duration.asMilliseconds());
    if (buckets > maxBuckets) {
      throw new Error(`Max buckets exceeded: ${buckets} is greater than ${maxBuckets}, try a larger time interval in the panel options.`);
    }
  }
}
