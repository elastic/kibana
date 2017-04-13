import _ from 'lodash';
import { AggTypesAggTypeProvider } from 'ui/agg_types/agg_type';

export function AggTypesBucketsBucketAggTypeProvider(Private) {
  const AggType = Private(AggTypesAggTypeProvider);

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
}
