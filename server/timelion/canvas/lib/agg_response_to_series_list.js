const _ = require('lodash');

export function timeBucketsToPairs(buckets) {
  const timestamps = _.map(buckets, 'key');
  const series = {};
  _.each(buckets, function (bucket) {
    _.forOwn(bucket, function (val, key) {
      if (_.isPlainObject(val)) {
        series[key] = series[key] || [];
        series[key].push(val.value);
      }
    });
  });

  return _.mapValues(series, function (values) {
    return _.zip(timestamps, values);
  });
}

export function flattenBucket(bucket, dimensions, result) {
  result = result || {};
  dimensions = dimensions || []; // Each element: {label: [], columns: ['country', 'US'], [max]}
  _.forOwn(bucket, function (val, aggName) {
    if (!_.isPlainObject(val)) return;
    if (_.get(val, 'meta.type') === 'queries') {
      _.each(val.buckets, function (bucket, bucketName) {
        const queryString = bucketName;
        flattenBucket(bucket, dimensions.concat([['-q', queryString]]), result);
      });
    }
    else if (_.get(val, 'meta.type') === 'terms') {
      _.each(val.buckets, function (bucket, bucketName) {
        const fieldName = aggName;
        const fieldValue = bucket.key;
        flattenBucket(bucket, dimensions.concat([[fieldName, fieldValue]]), result);
      });
    }
    else if (_.get(val, 'meta.type') === 'time_buckets') {
      const metrics = timeBucketsToPairs(val.buckets);
      _.each(metrics, function (pairs, metricName) { // Do not add columns for meta here
        // {pairs: [[1444534253, 21],[1444534253, 42],[1444534253, 10]], columns: {country: US, __queryString: foo}
        const label = _.map(dimensions, dim => `${dim[0]}:${dim[1]}`).join(' > ');

        result[`${label} > ${metricName}`] = {pairs: pairs, dimensions: dimensions};
      });
    }
  });
  return result;
}

export default function toSeriesList(aggs, config) {
  return _.map(flattenBucket(aggs), function (result, label) {
    return {
      data: result.pairs,
      type: 'series',
      fit: config.fit,
      label: label,
      meta: {columns: _.fromPairs(result.dimensions)}
    };
  });
}
