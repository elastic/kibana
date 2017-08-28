import _ from 'lodash';

export function AggResponseBucketsProvider() {

  function Buckets(aggResp) {
    if (_.has(aggResp, 'buckets')) {
      this.buckets = aggResp.buckets;
    } else {
      // Some Bucket Aggs only return a single bucket (like filter).
      // In those instances, the aggResp is the content of the single bucket.
      this.buckets = [aggResp];
    }

    this.objectMode = _.isPlainObject(this.buckets);
    if (this.objectMode) {
      this._keys = _.keys(this.buckets);
      this.length = this._keys.length;
    } else {
      this.length = this.buckets.length;
    }
  }

  Buckets.prototype.forEach = function (fn) {
    const buckets = this.buckets;

    if (this.objectMode) {
      this._keys.forEach(function (key) {
        fn(buckets[key], key);
      });
    } else {
      buckets.forEach(function (bucket) {
        fn(bucket, bucket.key);
      });
    }
  };

  return Buckets;
}
