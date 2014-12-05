define(function (require) {
  return function PointSeriesOrderedDateAxis(timefilter) {
    var moment = require('moment');
    var interval = require('utils/interval');

    return function orderedDateAxis(vis, table, chart) {
      var aspects = chart.aspects;
      var bounds = timefilter.getBounds();
      var format = interval.calculate(
        moment(bounds.min.valueOf()),
        moment(bounds.max.valueOf()),
        table.rows.length
      ).format;

      chart.xAxisFormatter = function (val) {
        return moment(val).format(format);
      };

      var xAggOutput = aspects.x.agg.write();
      chart.ordered = {
        date: true,
        interval: interval.toMs(xAggOutput.params.interval)
      };

      if (vis.indexPattern.timeFieldName) {
        var timeBounds = timefilter.getBounds();
        chart.ordered.min = timeBounds.min.valueOf();
        chart.ordered.max = timeBounds.max.valueOf();
      }
    };
  };
});