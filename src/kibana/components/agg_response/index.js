define(function (require) {
  return function NormalizeChartDataFactory(Private) {
    return {
      hierarchical: Private(require('components/agg_response/hierarchical/build_hierarchical_data')),
      point_series: Private(require('components/agg_response/point_series/point_series')),
      tabify: Private(require('components/agg_response/tabify/tabify')),
      flat: Private(require('components/agg_response/flat'))
    };
  };
});