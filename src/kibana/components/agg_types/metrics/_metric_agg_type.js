define(function (require) {
  return function MetricAggTypeProvider(Private) {
    var _ = require('lodash');
    var AggType = Private(require('components/agg_types/_agg_type'));

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

    return MetricAggType;
  };
});