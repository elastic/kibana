define(function (require) {
  return function AggTypeService(Private) {
    let IndexedArray = require('ui/IndexedArray');

    let aggs = {
      metrics: [
        Private(require('ui/agg_types/metrics/count')),
        Private(require('ui/agg_types/metrics/avg')),
        Private(require('ui/agg_types/metrics/sum')),
        Private(require('ui/agg_types/metrics/median')),
        Private(require('ui/agg_types/metrics/min')),
        Private(require('ui/agg_types/metrics/max')),
        Private(require('ui/agg_types/metrics/stdDeviation')),
        Private(require('ui/agg_types/metrics/cardinality')),
        Private(require('ui/agg_types/metrics/percentiles')),
        Private(require('ui/agg_types/metrics/percentile_ranks'))
      ],
      buckets: [
        Private(require('ui/agg_types/buckets/date_histogram')),
        Private(require('ui/agg_types/buckets/histogram')),
        Private(require('ui/agg_types/buckets/range')),
        Private(require('ui/agg_types/buckets/date_range')),
        Private(require('ui/agg_types/buckets/ip_range')),
        Private(require('ui/agg_types/buckets/terms')),
        Private(require('ui/agg_types/buckets/filters')),
        Private(require('ui/agg_types/buckets/significant_terms')),
        Private(require('ui/agg_types/buckets/geo_hash'))
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

  // preload
  require('ui/agg_types/AggParams');
});
