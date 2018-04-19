import _ from 'lodash';
import { AggTypesAggTypeProvider } from '../agg_type';
import { createLegacyClass } from '../../utils/legacy_class';

export function AggTypesBucketsBucketAggTypeProvider(Private) {
  const AggType = Private(AggTypesAggTypeProvider);

  createLegacyClass(BucketAggType).inherits(AggType);
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
