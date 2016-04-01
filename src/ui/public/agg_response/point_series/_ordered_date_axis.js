define(function (require) {
  return function PointSeriesOrderedDateAxis(timefilter) {
    let moment = require('moment');

    return function orderedDateAxis(vis, chart) {
      let xAgg = chart.aspects.x.agg;
      let buckets = xAgg.buckets;
      let format = buckets.getScaledDateFormat();

      chart.xAxisFormatter = function (val) {
        return moment(val).format(format);
      };

      chart.ordered = {
        date: true,
        interval: buckets.getInterval(),
      };

      let axisOnTimeField = xAgg.fieldIsTimeField();
      let bounds = buckets.getBounds();
      if (bounds && axisOnTimeField) {
        chart.ordered.min = bounds.min;
        chart.ordered.max = bounds.max;
      } else {
        chart.ordered.endzones = false;
      }
    };
  };
});
