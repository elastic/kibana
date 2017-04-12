import _ from 'lodash';

export function AggResponseBucketsProvider() {
  function Buckets(aggResp) {
    aggResp = aggResp || false;
    this.buckets = aggResp.buckets || [];
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
