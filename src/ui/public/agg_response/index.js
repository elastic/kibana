define(function (require) {
  return function NormalizeChartDataFactory(Private) {
    return {
      hierarchical: Private(require('ui/agg_response/hierarchical/build_hierarchical_data')),
      pointSeries: Private(require('ui/agg_response/point_series/point_series')),
      tabify: Private(require('ui/agg_response/tabify/tabify')),
      geoJson: Private(require('ui/agg_response/geo_json/geo_json'))
    };
  };
});
