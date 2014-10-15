define(function (require) {
  return function HistogramConverterFn(Private, timefilter, $compile, $rootScope) {
    var _ = require('lodash');
    var $ = require('jquery');
    var moment = require('moment');
    var interval = require('utils/interval');

    var $tooltipScope = $rootScope.$new();
    var $tooltip = $(require('text!components/vis_types/tooltips/histogram.html'));
    $compile($tooltip)($tooltipScope);

    return function (chart, columns, rows) {
      // index of color
      var iColor = _.findIndex(columns, { categoryName: 'group' });
      var colColor = columns[iColor];

      /*****
       * Get values related to the X-Axis
       *****/

      // index of the x-axis column
      var iX = _.findIndex(columns, { categoryName: 'segment'});
      // when we don't have an x-axis, just push everything into '_all'
      if (iX === -1) {
        iX = columns.push({
          label: '',
          categoryName: 'segment'
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
      var captureXRange = false;

      // X-axis description
      chart.xAxisLabel = colX.label;

      // identify how the x-axis is ordered
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

        chart.ordered = {
          date: true,
          interval: interval.toMs(colX.params.interval)
        };

        if (colX.aggConfig.vis.indexPattern.timeFieldName) {
          var timeBounds = timefilter.getBounds();
          chart.ordered.min = timeBounds.min.valueOf();
          chart.ordered.max = timeBounds.max.valueOf();
        } else {
          captureXRange = true;
        }
      }

      if (!chart.ordered) {
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
      chart.tooltipFormatter = function (event) {
        $tooltipScope.details = columns.map(function (col) {
          var datum = event.point;

          var label;
          var val;

          switch (col) {
          case colX:
            label = 'x';
            val = datum.x;
            break;
          case colY:
            label = 'y';
            val = datum.y;
            break;
          case colColor:
            label = 'color';
            val = datum.label;
            break;
          }

          label = (col.aggConfig && col.aggConfig.makeLabel()) || (col.field && col.field.name) || label;
          if (col.field) val = col.field.format.convert(val);

          return {
            label: label,
            value: val
          };

        });

        $tooltipScope.$apply();
        return $tooltip[0].outerHTML;
      };

      var series = chart.series = [];
      var seriesByLabel = {};

      rows.forEach(function (row) {
        var seriesLabel = colColor && row[iColor];
        var s = colColor ? seriesByLabel[seriesLabel] : series[0];

        if (!s) {
          // I know this could be simplified but I wanted to keep the key order
          if (colColor) {
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

        // skip this datum
        if (datum.y == null) return;

        if (colX.metricScale) {
          // support scaling response values to represent an average value on the y-axis
          datum.y = datum.y * colX.metricScale;
        }

        if (captureXRange) {
          chart.ordered.min = chart.ordered.min === void 0 ? datum.x : Math.min(chart.ordered.min, datum.x);
          chart.ordered.max = chart.ordered.max === void 0 ? datum.x : Math.max(chart.ordered.max, datum.x);
        }

        s.values.push(datum);
      });
    };
  };
});