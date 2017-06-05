import getAggValue from './get_agg_value';
export default function mapBucket(metric) {
  return bucket => [ bucket.key, getAggValue(bucket, metric)];
}
