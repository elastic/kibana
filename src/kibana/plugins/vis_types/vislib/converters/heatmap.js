define(function (require) {
  return function HeatmapConverterFn(Private, timefilter, $compile, $rootScope) {
    var _ = require('lodash');
    var $ = require('jquery');
    var moment = require('moment');
    var interval = require('utils/interval');

    var $tooltipScope = $rootScope.$new();
    var $tooltip = $(require('text!plugins/vis_types/tooltips/histogram.html'));
    $compile($tooltip)($tooltipScope);

    return function (chart, columns, rows) {
      // Row
      var iRow = _.findIndex(columns, { categoryName: 'row' });

      if (iRow === -1) {
        iRow = columns.push({
          label: '',
          categoryName: 'row'
        }) - 1;
      }

      var rowAxis = columns[iRow];

      // Column
      var iCol = _.findIndex(columns, { categoryName: 'column'});

      if (iCol === -1) {
        iCol = columns.push({
          label: '',
          categoryName: 'column'
        }) - 1;
      }

      var colAxis = columns[iCol];

      // Metric
      var iMetric = _.findIndex(columns, { categoryName: 'metric'});
      var metric = columns[iMetric];

      /*****
       * Build the chart
       *****/
      chart.columnLabel = colAxis.label;
      chart.rowLabel = rowAxis.label;
      chart.metricLabel = metric.label;

      if (metric.field) {
        chart.metricFormatter = metric.field.format.convert;
      }

      // aggregations for row and column
      var aggCol = colAxis.aggType;
      var aggRow = rowAxis.aggType;

      var labelFormatters = [
        {
          axis: colAxis,
          agg: aggCol,
          name: 'columnFormatter',
          ordered: 'columnOrdered'
        },
        {
          axis: rowAxis,
          agg: aggRow,
          name: 'rowFormatter',
          ordered: 'rowOrdered'
        }
      ];

      labelFormatters.forEach(function (obj) {
        var axis = obj.axis;
        var agg = obj.agg;
        var name = obj.name;

        chart[obj.ordered] = {};

        if (agg && agg.ordered && agg.ordered.date) {
          chart[name] = (function () {
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

          chart[obj.ordered] = {
            date: true,
            interval: interval.toMs(axis.params.interval)
          };

          if (axis.aggConfig.vis.indexPattern.timeFieldName) {
            var timeBounds = timefilter.getBounds();
            chart[obj.ordered].min = timeBounds.min.valueOf();
            chart[obj.ordered].max = timeBounds.max.valueOf();
          }
        }

        if (!chart[obj.ordered]) {
          chart[name] = axis.field && axis.field.format.convert;
          chart[obj.ordered] = agg && agg.ordered && {};
          if (agg !== false && axis && axis.params && axis.params.interval) {
            chart[obj.ordered].interval = axis.params.interval;
          }
        }
      });

      // setup the formatter for the label
      chart.tooltipFormatter = function (event) {
        $tooltipScope.details = columns.map(function (obj) {
          var datum = event.point;

          var label;
          var val;

          switch (obj) {
          case colAxis:
            label = 'column';
            val = datum.x;
            break;
          case rowAxis:
            label = 'row';
            val = datum.row;
            break;
          case metric:
            label = 'metric';
            val = datum.y;
            break;
          }

          label = (obj.aggConfig && obj.aggConfig.makeLabel()) || (obj.field && obj.field.name) || label;
          if (obj.field) val = obj.field.format.convert(val);

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

      // TODO: Need to make vislib accept an empty series.
      if (rows.length === 0) {
        chart.hits = 0;
        chart.series.push({ values: [ { x: '_all', y: 0 } ] });
      }

      // add date format to align data by interval
      var getInterval = function(ordered) {
        if (ordered.date) {
          if (ordered.interval > 604800000) {
            ordered.str = 'month';
            ordered.format = d3.time.format("%m");// month as a decimal number [01,12]
          } else if (ordered.interval > 86400000) {
            ordered.str = 'week';
            ordered.format = d3.time.format("%w");// weekday as a decimal number [0,6]
          } else if (ordered.interval > 3600000) {
            ordered.str = 'day';
            ordered.format = d3.time.format("%d");// zero-padded day of the month as a decimal number [01,31]
          } else if (ordered.interval > 60000) {
            ordered.str = 'hour';
            ordered.format = d3.time.format("%H");// hour (24-hour clock) as a decimal number [00,23]
          } else if (ordered.interval > 1000) {
            ordered.str = 'min';
            ordered.format = d3.time.format("%M");// minute as a decimal number [00,59]
          } else {
            ordered.str = 'sec';
            ordered.format = d3.time.format("%S");// second as a decimal number [00,61]
          }
        }
        return ordered;
      };

      console.log('columnOrdered:', getInterval(chart.columnOrdered));
      console.log('rowOrdered:', getInterval(chart.rowOrdered));

      rows.forEach(function (row) {
        var seriesLabel = rowAxis && row[iRow];
        var s = rowAxis ? seriesByLabel[seriesLabel] : series[0];

        if (!s) {
          // This could be simplified but want to keep the key order
          if (rowAxis) {
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
          x: (row[iCol] == null) ? '_all' : row[iCol],
          row: (row[iRow] == null) ? '_all' : row[iRow],
          y: row[iMetric === -1 ? row.length - 1 : iMetric]
        };

        // if (new Date(datum.x) != 'Invalid Date') {
        //   datum.xInterval = chart.columnOrdered.format(new Date(row[iCol]);
        // }

        // if (new Date(datum.row) != 'Invalid Date') {
        //   datum.rowInterval = chart.rowOrdered.format(new Date(row[iRow]);
        // }

        // skip this datum
        if (datum.y == null) return;

        if (colAxis.metricScale) {
          // support scaling response values to represent an average value on the y-axis
          datum.y = datum.y * colAxis.metricScale;
        }

        s.values.push(datum);
      });

      //console.log('chart.final', chart);

    };
  };
});