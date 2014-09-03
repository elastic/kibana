define(function (require) {
  return function AggTypeService(Private) {
    var Registry = require('utils/registry/registry');

    var aggs = {
      metrics: Private(require('components/agg_types/metric_aggs')),
      buckets: [
        Private(require('components/agg_types/buckets/date_histogram')),
        Private(require('components/agg_types/buckets/histogram')),
        Private(require('components/agg_types/buckets/range')),
        Private(require('components/agg_types/buckets/terms')),
        Private(require('components/agg_types/buckets/filters')),
        Private(require('components/agg_types/buckets/significant_terms'))
      ]
    };

    Object.keys(aggs).forEach(function (type) {
      aggs[type].forEach(function (agg) {
        agg.type = type;
      });
    });


    /**
     * Registry of Aggregation Types.
     *
     * These types form two groups, metric and buckets.
     *
     * @module agg_types
     * @type {Registry}
     */
    return new Registry({

      /**
       * @type {Array}
       */
      index: ['name'],

      /**
       * [group description]
       * @type {Array}
       */
      group: ['type'],
      initialSet: aggs.metrics.concat(aggs.buckets)
    });
  };
});