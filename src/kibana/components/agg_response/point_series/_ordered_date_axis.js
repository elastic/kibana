define(function (require) {
  return function PointSeriesOrderedDateAxis(timefilter) {
    var moment = require('moment');

    return function orderedDateAxis(vis, chart) {
      var xAgg = chart.aspects.x.agg;
      var buckets = xAgg.buckets;
      var format = buckets.getScaledDateFormat();

      chart.xAxisFormatter = function (val) {
        return moment(val).format(format);
      };

      chart.ordered = {
        date: true,
        interval: buckets.getInterval(),
      };

      var axisOnTimeField = xAgg.fieldIsTimeField();
      var bounds = buckets.getBounds();
      if (bounds && axisOnTimeField) {
        chart.ordered.min = bounds.min;
        chart.ordered.max = bounds.max;
      } else {
        chart.ordered.endzones = false;
      }
    };
  };
});