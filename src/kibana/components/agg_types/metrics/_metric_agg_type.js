define(function (require) {
  return function MetricAggTypeProvider(Private, indexPatterns) {
    var _ = require('lodash');
    var AggType = Private(require('components/agg_types/_agg_type'));
    var fieldFormats = Private(require('registry/field_formats'));

    _(MetricAggType).inherits(AggType);
    function MetricAggType(config) {
      MetricAggType.Super.call(this, config);

      if (_.isFunction(config.getValue)) {
        this.getValue = config.getValue;
      }
    }

    /**
     * Read the values for this metric from the
     * @param  {[type]} bucket [description]
     * @return {[type]}        [description]
     */
    MetricAggType.prototype.getValue = function (agg, bucket) {
      return bucket[agg.id].value;
    };

    MetricAggType.prototype.getFormat = function (agg) {
      var field = agg.field();
      if (field && field.type === 'date' && field.format) {
        return field.format;
      } else {
        return fieldFormats.for('number');
      }
    };

    return MetricAggType;
  };
});
