define(function (require) {
  return function HistogramConverterFn(Private, timefilter) {
    var _ = require('lodash');
    var moment = require('moment');
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
      var aggX = colX.aggType;

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
          interval: interval.toMs(colX.params.interval)
        };
      }
      else {
        chart.xAxisFormatter = colX.field && colX.field.format.convert;
        chart.ordered = aggX && aggX.ordered && {};
        if (aggX !== false && colX && colX.params && colX.params.interval) {
          chart.ordered.interval = colX.params.interval;
        }
      }

      // Y-axis description
      chart.yAxisLabel = colY.label;
      if (colY.field) chart.yAxisFormatter = colY.field.format.convert;



      // setup the formatter for the label
      chart.tooltipFormatter = function (datapoint) {
        var datum = _.clone(datapoint);

        if (colX.field) datum.name = colX.field.format.convert(datum.name);
        if (colY.field) datum.size = colY.field.format.convert(datum.size);

        if (colX.metricScaleText) {
          datum.size += ' per ' + colX.metricScaleText;
        }


        var out = datum.name ? datum.name + '\n' : '';
        out += datum.value;

        return out;
      };

      var slices = chart.slices = {};
      var name = slices.name = chart.xAxisLabel + ' ' + chart.yAxisLabel;
      var children = slices.children = [];
      var slicesByName = {};

      rows.forEach(function (row) {
        var sliceName = hasColor && row[iColor];
        var s = hasColor ? slicesByName[sliceName] : undefined;

        var datum = {
          name: (row[iX] == null) ? '_all' : row[iX],
          size: row[iY === -1 ? row.length - 1 : iY] // y-axis value
        };

        if (colX.metricScale) {
          // support scaling response values to represent an average value on the y-axis
          datum.size = datum.size * colX.metricScale;
        }

        if (!s) {
          if (hasColor) {
            s = {
              name: sliceName,
              children: []
            };
            slicesByName[sliceName] = s;

            children.push(s);
          } else {
            children.push(datum);
          }
        } else {
          s.children.push(datum);
        }
      });
    };
  };
});
