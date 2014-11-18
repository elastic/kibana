define(function (require) {
  return function Series() {
    function yAxis(chart, col, agg, xAggOutput) {
      chart.yAxisLabel = col.y.label;
      chart.yAxisFormatter = agg.y.fieldFormatter();
      chart.yScale = xAggOutput.metricScale || null;
    }

    return yAxis;
  };
});