define(function (require) {
  return function HistogramConverterFn(Private, timefilter) {
    var _ = require('lodash');
    var moment = require('moment');
    var aggs = Private(require('../_aggs'));
    var interval = require('utils/interval');

    return function (chart, columns, rows) {
      // index of color
      var iColor = _.findIndex(columns, { categoryName: 'group' });
      var hasColor = iColor !== -1;

      /*****
       * Get values related to the X-Axis
       *****/

      // index of the x-axis column
      var iX = _.findIndex(columns, { categoryName: 'segment'});
      // when we don't have an x-axis, just push everything into '_all'
      if (iX === -1) {
        iX = columns.push({
          label: ''
        }) - 1;
      }
      // column that defines the x-axis
      var colX = columns[iX];
      // aggregation for the x-axis
      var aggX = colX.agg && aggs.byName[colX.agg];

      /*****
       * Get values related to the X-Axis
       *****/

      // index of y-axis stuff
      var iY = _.findIndex(columns, { categoryName: 'metric'});
      // column for the y-axis
      var colY = columns[iY];


      /*****
       * Build the chart
       *****/

      // X-axis description
      chart.xAxisLabel = colX.label;
      if (aggX && aggX.ordered && aggX.ordered.date) {
        chart.xAxisFormatter = (function () {
          var bounds = timefilter.getBounds();
          var format = interval.calculate(
            moment(bounds.min.valueOf()),
            moment(bounds.max.valueOf()),
            rows.length
          ).format;

          return function (thing) {
            return moment(thing).format(format);
          };
        }());

        var timeBounds = timefilter.getBounds();
        chart.ordered = {
          date: true,
          min: timeBounds.min.valueOf(),
          max: timeBounds.max.valueOf(),
          interval: interval.toMs(colX.aggParams.interval)
        };
      }
      else {
        chart.xAxisFormatter = colX.field && colX.field.format.convert;
        chart.ordered = aggX && aggX.ordered && {};
        if (aggX !== false && colX && colX.aggParams && colX.aggParams.interval) {
          chart.ordered.interval = colX.aggParams.interval;
        }
      }

      // Y-axis description
      chart.yAxisLabel = colY.label;
      if (colY.field) chart.yAxisFormatter = colY.field.format.convert;



      // setup the formatter for the label
      chart.tooltipFormatter = function (datapoint) {
        var datum = _.clone(datapoint);

        if (colX.field) datum.x = colX.field.format.convert(datum.x);
        if (colY.field) datum.y = colY.field.format.convert(datum.y);

        if (colX.metricScaleText) {
          datum.y += ' per ' + colX.metricScaleText;
        }


        var out = datum.label ? datum.label + '\n' : '';
        out += datum.x + '\n';
        out += datum.y;

        return out;
      };

      var series = chart.series = [];
      var seriesByLabel = {};

      rows.forEach(function (row) {
        var seriesLabel = hasColor && row[iColor];
        var s = hasColor ? seriesByLabel[seriesLabel] : series[0];

        if (!s) {
          // I know this could be simplified but I wanted to keep the key order
          if (hasColor) {
            s = {
              label: seriesLabel,
              values: []
            };
            seriesByLabel[seriesLabel] = s;
          } else {
            s = {
              values: []
            };
          }
          series.push(s);
        }

        var datum = {
          x: (row[iX] == null) ? '_all' : row[iX],
          y: row[iY === -1 ? row.length - 1 : iY] // y-axis value
        };

        if (colX.metricScale) {
          // support scaling response values to represent an average value on the y-axis
          datum.y = datum.y * colX.metricScale;
        }

        s.values.push(datum);
      });
    };
  };
});