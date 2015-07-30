define(function (require) {
  return function PointSeriesInitYAxis() {
    var _ = require('lodash');

    return function initYAxis(chart) {
      var y = chart.aspects.y;
      var x = chart.aspects.x;

      if (_.isArray(y)) {
        // TODO: vis option should allow choosing this format
        chart.yAxisFormatter = y[0].agg.fieldFormatter();
        chart.yAxisLabel = ''; // use the legend
      } else {
        chart.yAxisFormatter = y.agg.fieldFormatter();
        chart.yAxisLabel = y.col.title;
      }

      var xAggOutput = x.agg.write();
      chart.yScale = xAggOutput.metricScale || null;
    };
  };
});
