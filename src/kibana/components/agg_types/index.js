define(function (require) {
  return function AggTypeService(Private) {
    var IndexedArray = require('utils/indexed_array/index');

    var aggs = {
      metrics: Private(require('components/agg_types/metric_aggs')),
      buckets: [
        Private(require('components/agg_types/buckets/date_histogram')),
        Private(require('components/agg_types/buckets/histogram')),
        Private(require('components/agg_types/buckets/range')),
        Private(require('components/agg_types/buckets/terms')),
        Private(require('components/agg_types/buckets/filters')),
        Private(require('components/agg_types/buckets/significant_terms')),
        Private(require('components/agg_types/buckets/geo_hash'))
      ]
    };

    Object.keys(aggs).forEach(function (type) {
      aggs[type].forEach(function (agg) {
        agg.type = type;
      });
    });


    /**
     * IndexedArray of Aggregation Types.
     *
     * These types form two groups, metric and buckets.
     *
     * @module agg_types
     * @type {IndexedArray}
     */
    return new IndexedArray({

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