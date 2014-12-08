define(function (require) {
  return function PointSeriesInitX() {
    return function initXAxis(chart) {
      var x = chart.aspects.x;
      chart.xAxisFormatter = x.agg ? x.agg.fieldFormatter() : String;
      chart.xAxisLabel = x.col.title;

      if (!x.agg || !x.agg.type.ordered) return;

      chart.ordered = {};
      var xAggOutput = x.agg.write();
      if (xAggOutput.params.interval) {
        chart.ordered.interval = xAggOutput.params.interval;
      }
    };
  };
});