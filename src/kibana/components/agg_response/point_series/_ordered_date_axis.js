define(function (require) {
  return function PointSeriesOrderedDateAxis(timefilter) {
    var moment = require('moment');

    return function orderedDateAxis(vis, chart) {
      var aspects = chart.aspects;
      var buckets = aspects.x.agg.params.buckets;
      var format = buckets.getScaledDateFormat();

      chart.xAxisFormatter = function (val) {
        return moment(val).format(format);
      };

      var bounds = buckets.getBounds();
      var interval = buckets.getInterval();
      chart.ordered = {
        date: true,
        interval: interval,
        min: bounds.min,
        max: bounds.max
      };
    };
  };
});