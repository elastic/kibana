define(function (require) {
  return function PointSeriesOrderedDateAxis(timefilter) {
    var moment = require('moment');

    return function orderedDateAxis(vis, chart) {
      var aspects = chart.aspects;
      var buckets = aspects.x.agg.buckets;
      var format = buckets.getScaledDateFormat();

      chart.xAxisFormatter = function (val) {
        return moment(val).format(format);
      };

      chart.ordered = {
        date: true,
        interval: buckets.getInterval(),
      };

      var bounds = buckets.getBounds();
      if (bounds) {
        chart.ordered.min = bounds.min;
        chart.ordered.max = bounds.max;
      }
    };
  };
});