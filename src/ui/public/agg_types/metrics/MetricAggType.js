define(function (require) {
  return function MetricAggTypeProvider(Private) {
    var _ = require('lodash');
    var AggType = Private(require('ui/agg_types/AggType'));
    var fieldFormats = Private(require('ui/registry/field_formats'));

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
     * @return {[type]}        [description]
     */
    MetricAggType.prototype.getValue = function (agg, bucket) {
      return bucket[agg.id].value;
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
      var field = agg.field();
      return field ? field.format : fieldFormats.getDefaultInstance('number');
    };

    return MetricAggType;
  };
});
