define(function (require) {
  return function PointSeriesProvider(Private) {
    let _ = require('lodash');

    let getSeries = Private(require('ui/agg_response/point_series/_get_series'));
    let getAspects = Private(require('ui/agg_response/point_series/_get_aspects'));
    let initYAxis = Private(require('ui/agg_response/point_series/_init_y_axis'));
    let initXAxis = Private(require('ui/agg_response/point_series/_init_x_axis'));
    let setupOrderedDateXAxis = Private(require('ui/agg_response/point_series/_ordered_date_axis'));
    let tooltipFormatter = Private(require('ui/agg_response/point_series/_tooltip_formatter'));

    return function pointSeriesChartDataFromTable(vis, table) {
      let chart = {};
      let aspects = chart.aspects = getAspects(vis, table);

      chart.tooltipFormatter = tooltipFormatter;

      initXAxis(chart);
      initYAxis(chart);

      let datedX = aspects.x.agg.type.ordered && aspects.x.agg.type.ordered.date;
      if (datedX) {
        setupOrderedDateXAxis(vis, chart);
      }

      chart.series = getSeries(table.rows, chart);

      delete chart.aspects;
      return chart;
    };
  };
});
