define(function (require) {
  var _ = require('lodash');

  function Buckets(aggResp) {
    aggResp = aggResp || false;
    this.buckets = aggResp.buckets || [];
    this.length = this.buckets.length;
    this.objectMode = _.isPlainObject(this.buckets);
  }

  Buckets.prototype.forEach = function (fn) {
    if (this.objectMode) {
      _.forOwn(this.buckets, fn);
    } else {
      this.buckets.forEach(function (bucket) {
        fn(bucket, bucket.key);
      });
    }
  };

  return Buckets;
});