define(function (require) {
  return function PointSeriesYAxis() {
    var _ = require('lodash');

    function yAxis(chart, col, agg, xAggOutput) {
      if (_.isArray(col.y)) {
        // TODO: vis option should allow choosing this format
        chart.yAxisFormatter = agg.y[0].fieldFormatter();
        chart.yAxisLabel = ''; // use the legend
      } else {
        chart.yAxisLabel = col.y.label;
        chart.yAxisFormatter = agg.y.fieldFormatter();
      }

      chart.yScale = xAggOutput.metricScale || null;
    }

    return yAxis;
  };
});