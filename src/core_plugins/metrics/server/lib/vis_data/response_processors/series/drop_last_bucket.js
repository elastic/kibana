import { get } from 'lodash';
export function dropLastBucket(resp, panel, series) {
  return next => results => {
    const seriesDropLastBucket = get(series, 'override_drop_last_bucket', 1);
    const dropLastBucket = get(panel, 'drop_last_bucket', seriesDropLastBucket);
    if (dropLastBucket) {
      results.forEach(item => {
        item.data = item.data.slice(0, item.data.length - 1);
      });
    }
    return next(results);
  };
}

