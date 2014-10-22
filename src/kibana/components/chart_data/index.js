define(function (require) {
  return function NormalizeChartDataFactory(Private) {
    return {
      flat: Private(require('components/chart_data/flat')),
      hierarchical: Private(require('components/chart_data/hierarchical/build_hierarchical_data'))
    };
  };
});