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

    return new Registry({
      index: ['name'],
      group: ['type'],
      initialSet: aggs.metrics.concat(aggs.buckets)
    });
  };
});