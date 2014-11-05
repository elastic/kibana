define(function (require) {
  return function NormalizeChartDataFactory(Private) {
    return {
      flat: Private(require('components/agg_response/flat')),
      hierarchical: Private(require('components/agg_response/hierarchical/build_hierarchical_data')),
      tabify: Private(require('components/agg_response/tabify/tabify'))
    };
  };
});