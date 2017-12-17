import { dropLastBucket } from '../series/drop_last_bucket';

export function dropLastBucketFn(bucket, panel, series) {
  return next => results => {
    const fn = dropLastBucket({ aggregations: bucket }, panel, series);
    return fn(next)(results);
  };
}
