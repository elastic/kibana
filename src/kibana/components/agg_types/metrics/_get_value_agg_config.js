define(function (require) {
  return function ValueAggConfigProvider() {
    var _ = require('lodash');

    /**
     * Get the ValueAggConfig class for an aggConfig,
     * which might be cached on the aggConfig or created.
     *
     * @param  {AggConfig} agg - the AggConfig the VAC should inherit from
     * @param  {object} props - properties that the VAC should have
     * @return {Constructor} - a constructor for VAC objects that will inherit the aggConfig
     */
    return function getValueConfigClass(agg, props) {
      if (agg.$$_ValueAggConfigClass) {
        return agg.$$_ValueAggConfigClass;
      } else {
        return (agg.$$_ValueAggConfigClass = create(agg, props));
      }
    };

    function create(parentAgg, props) {

      /**
       * AggConfig "wrapper" for multi-value metric aggs which
       * need to modify AggConfig behavior for each value produced.
       *
       * @param {string|number} key - the key or index that identifies
       *                            this part of the multi-value
       */
      function ValueAggConfig(key) {
        this.key = key;
        this.parentId = this.id;
        this.id = this.parentId + '$$' + key;
      }

      ValueAggConfig.prototype = Object.create(parentAgg, {
        constructor: ValueAggConfig
      });

      _.assign(ValueAggConfig.prototype, props);

      return ValueAggConfig;
    }
  };
});