define(function (require) {
  return function PointSeriesPrepareBasicX() {
    return function prepareBasicXAxis(chart) {
      var x = chart.aspects.x;
      chart.xAxisFormatter = x.agg ? x.agg.fieldFormatter() : String;
      chart.xAxisLabel = x.col.title;

      if (!x.agg || !x.agg.type.ordered) return;

      chart.ordered = {};
      if (x.agg.params.interval) {
        chart.ordered.interval = x.agg.params.interval;
      }
    };
  };
});