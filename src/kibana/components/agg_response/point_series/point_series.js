define(function (require) {
  return function PointSeriesProvider(Private) {
    var _ = require('lodash');

    var getSeries = Private(require('components/agg_response/point_series/_get_series'));
    var getAspects = Private(require('components/agg_response/point_series/_get_aspects'));
    var initYAxis = Private(require('components/agg_response/point_series/_init_y_axis'));
    var initXAxis = Private(require('components/agg_response/point_series/_init_x_axis'));
    var setupOrderedDateXAxis = Private(require('components/agg_response/point_series/_ordered_date_axis'));
    var tooltipFormatter = Private(require('components/agg_response/point_series/_tooltip_formatter'));

    return function pointSeriesChartDataFromTable(vis, table) {
      var chart = {};
      var aspects = chart.aspects = getAspects(vis, table);

      chart.tooltipFormatter = tooltipFormatter;

      initXAxis(chart);
      initYAxis(chart);

      var datedX = aspects.x.agg.type.ordered && aspects.x.agg.type.ordered.date;
      if (datedX) {
        setupOrderedDateXAxis(vis, chart);
      }

      chart.series = getSeries(table.rows, chart);

      delete chart.aspects;
      return chart;
    };
  };
});
