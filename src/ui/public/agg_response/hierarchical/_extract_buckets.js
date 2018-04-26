import _ from 'lodash';

function decorateWithKey(agg, bucket, key) {
  const decorated = _.cloneDeep(bucket);
  decorated.key = agg ? agg.getKey(bucket, key) : key;
  return decorated;
}

export function extractBuckets(bucket, agg) {
  if (bucket) {
    if (_.isPlainObject(bucket.buckets)) {
      return _.map(bucket.buckets, function (value, key) {
        return decorateWithKey(agg, value, key);
      });
    } else if(_.isArray(bucket.buckets)) {
      return bucket.buckets.map(value => {
        return decorateWithKey(agg, value, value.key);
      });
    }
  }
  return bucket && bucket.buckets || [];
}
