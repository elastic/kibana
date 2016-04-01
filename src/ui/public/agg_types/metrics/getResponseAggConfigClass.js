define(function (require) {
  return function ResponseAggConfigProvider() {
    let _ = require('lodash');

    /**
     * Get the ResponseAggConfig class for an aggConfig,
     * which might be cached on the aggConfig or created.
     *
     * @param  {AggConfig} agg - the AggConfig the VAC should inherit from
     * @param  {object} props - properties that the VAC should have
     * @return {Constructor} - a constructor for VAC objects that will inherit the aggConfig
     */
    return function getResponseConfigClass(agg, props) {
      if (agg.$$_ResponseAggConfigClass) {
        return agg.$$_ResponseAggConfigClass;
      } else {
        return (agg.$$_ResponseAggConfigClass = create(agg, props));
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
      function ResponseAggConfig(key) {
        this.key = key;
        this.parentId = this.id;

        let subId = String(key);
        if (subId.indexOf('.') > -1) {
          this.id = this.parentId + '[\'' + subId.replace(/'/g, '\\\'') + '\']';
        } else {
          this.id = this.parentId + '.' + subId;
        }
      }

      ResponseAggConfig.prototype = Object.create(parentAgg, {
        constructor: ResponseAggConfig
      });

      _.assign(ResponseAggConfig.prototype, props);

      return ResponseAggConfig;
    }
  };
});
