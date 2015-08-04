define(function (require) {
  return function BucketAggTypeProvider(Private) {
    var _ = require('lodash');
    var AggType = Private(require('ui/agg_types/AggType'));

    _.class(BucketAggType).inherits(AggType);
    function BucketAggType(config) {
      BucketAggType.Super.call(this, config);

      if (_.isFunction(config.getKey)) {
        this.getKey = config.getKey;
      }
    }

    BucketAggType.prototype.getKey = function (bucket, key) {
      return key || bucket.key;
    };

    return BucketAggType;
  };
});
