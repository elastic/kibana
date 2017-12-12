import _ from 'lodash';

export function timeBucketsToPairs(buckets) {
  const timestamps = _.pluck(buckets, 'key');
  const series = {};
  _.each(buckets, function (bucket) {
    _.forOwn(bucket, function (val, key) {
      if (_.isPlainObject(val)) {
        if (val.values) {
          _.forOwn(val.values, function (bucketValue, bucketKey) {
            const k = key + ':' + bucketKey;
            const v = isNaN(bucketValue) ? NaN : bucketValue;
            series[k] = series[k] || [];
            series[k].push(v);
          });
        } else {
          series[key] = series[key] || [];
          series[key].push(val.value);
        }
      }
    });
  });

  return _.mapValues(series, function (values) {
    return _.zip(timestamps, values);
  });
}

export function flattenBucket(bucket, splitKey, path, result) {
  result = result || {};
  path = path || [];
  _.forOwn(bucket, function (val, key) {
    if (!_.isPlainObject(val)) return;
    if (_.get(val, 'meta.type') === 'split') {
      _.each(val.buckets, function (bucket, bucketKey) {
        if (bucket.key == null) bucket.key = bucketKey; // For handling "keyed" response formats, eg filters agg
        flattenBucket(bucket, bucket.key, path.concat([key + ':' + bucket.key]), result);
      });
    } else if (_.get(val, 'meta.type') === 'time_buckets') {
      const metrics = timeBucketsToPairs(val.buckets);
      _.each(metrics, function (pairs, metricName) {
        result[path.concat([metricName]).join(' > ')] = {
          data: pairs,
          splitKey: splitKey
        };
      });
    }
  });
  return result;
}

export default function toSeriesList(aggs, config) {
  return _.map(flattenBucket(aggs), function (metrics, name) {
    return {
      data: metrics.data,
      type: 'series',
      fit: config.fit,
      label: name,
      split: metrics.splitKey
    };
  });
}
