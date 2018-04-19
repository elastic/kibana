import _ from 'lodash';
import { AggTypesAggTypeProvider } from '../agg_type';
import { fieldFormats } from '../../registry/field_formats';
import { createLegacyClass } from '../../utils/legacy_class';

export function AggTypesMetricsMetricAggTypeProvider(Private) {
  const AggType = Private(AggTypesAggTypeProvider);


  createLegacyClass(MetricAggType).inherits(AggType);
  function MetricAggType(config) {
    MetricAggType.Super.call(this, config);

    // allow overriding any value on the prototype
    _.forOwn(config, function (val, key) {
      if (_.has(MetricAggType.prototype, key)) {
        this[key] = val;
      }
    }, this);
  }

  MetricAggType.prototype.subtype = 'Metric Aggregations';
  /**
   * Read the values for this metric from the
   * @param  {[type]} bucket [description]
   * @return {*}        [description]
   */
  MetricAggType.prototype.getValue = function (agg, bucket) {
    // Metric types where an empty set equals `zero`
    const isSettableToZero = ['cardinality', 'sum'].indexOf(agg.__type.name) !== -1;

    // Return proper values when no buckets are present
    // `Count` handles empty sets properly
    if (!bucket[agg.id] && isSettableToZero) return 0;

    return bucket[agg.id] && bucket[agg.id].value;
  };

  /**
   * Pick a format for the values produced by this agg type,
   * overriden by several metrics that always output a simple
   * number
   *
   * @param  {agg} agg - the agg to pick a format for
   * @return {FieldFromat}
   */
  MetricAggType.prototype.getFormat = function (agg) {
    const field = agg.getField();
    return field ? field.format : fieldFormats.getDefaultInstance('number');
  };

  /**
   * Determines if this metric can be scaled
   */
  MetricAggType.prototype.isScalable = function () {
    return false;
  };

  return MetricAggType;
}
