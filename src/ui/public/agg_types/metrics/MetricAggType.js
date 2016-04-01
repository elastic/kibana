define(function (require) {
  return function MetricAggTypeProvider(Private) {
    let _ = require('lodash');
    let AggType = Private(require('ui/agg_types/AggType'));
    let fieldFormats = Private(require('ui/registry/field_formats'));

    _.class(MetricAggType).inherits(AggType);
    function MetricAggType(config) {
      MetricAggType.Super.call(this, config);

      // allow overriding any value on the prototype
      _.forOwn(config, function (val, key) {
        if (_.has(MetricAggType.prototype, key)) {
          this[key] = val;
        }
      }, this);
    }

    /**
     * Read the values for this metric from the
     * @param  {[type]} bucket [description]
     * @return {*}        [description]
     */
    MetricAggType.prototype.getValue = function (agg, bucket) {
      // Metric types where an empty set equals `zero`
      let isSettableToZero = ['cardinality', 'sum'].indexOf(agg.__type.name) !== -1;

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
      let field = agg.field();
      return field ? field.format : fieldFormats.getDefaultInstance('number');
    };

    return MetricAggType;
  };
});
