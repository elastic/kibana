define(function (require) {
  return function (timefilter) {
    var moment = require('moment');
    var interval = require('utils/interval');

    function xAxis(invoke, chart, agg, col) {
      // identify the x-axis
      chart.xAxisLabel = col.x.title;
      if (agg.x && agg.x.type.ordered && agg.x.type.ordered.date) {
        invoke(dateXAxis);
      }
      else {
        invoke(basicXAxis);
      }
    }

    function basicXAxis(chart, agg) {
      chart.xAxisFormatter = agg.x ? agg.x.fieldFormatter() : String;

      if (!agg.x || !agg.x.ordered) return;

      chart.ordered = {};
      if (agg.x.params.interval) {
        chart.ordered.interval = agg.x.params.interval;
      }
    }

    function dateXAxis(vis, chart, col, agg, table, xAggOutput) {
      var bounds = timefilter.getBounds();
      var format = interval.calculate(
        moment(bounds.min.valueOf()),
        moment(bounds.max.valueOf()),
        table.rows.length
      ).format;

      chart.xAxisFormatter = function (val) {
        return moment(val).format(format);
      };

      chart.ordered = {
        date: true,
        interval: interval.toMs(xAggOutput.params.interval)
      };

      if (vis.indexPattern.timeFieldName) {
        var timeBounds = timefilter.getBounds();
        chart.ordered.min = timeBounds.min.valueOf();
        chart.ordered.max = timeBounds.max.valueOf();
      }
    }

    return xAxis;
  };
});
