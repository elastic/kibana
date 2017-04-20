import parseInterval from 'ui/utils/parse_interval';
export function validateInterval(timefilter, panel, maxBuckets) {
  const { interval } = panel;
  const { min, max } = timefilter.getBounds();
  // No need to check auto it will return around 100
  if (interval === 'auto') return;
  const duration = parseInterval(interval);
  if (!duration) {
    throw new Error(`Invalid interval: ${interval} is not a valid interval`);
  }
  const span = max.valueOf() - min.valueOf();
  const buckets = Math.floor(span / duration.asMilliseconds());
  if (buckets > maxBuckets) {
    throw new Error(`Max buckets exceeded: ${buckets} is greater than ${maxBuckets}, try a larger time interval in the panel options.`);
  }
}
