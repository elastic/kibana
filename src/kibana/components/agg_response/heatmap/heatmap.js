define(function (require) {
  return function HeatmapConverterFn(Private, timefilter, $compile, $rootScope) {
    var _ = require('lodash');
    var $ = require('jquery');
    var moment = require('moment');
    var interval = require('utils/interval');
    var tooltipFormatter = Private(require('components/agg_response/tooltip_formatter/tooltip_formatter'));
    var fakeXAspect = Private(require('components/agg_response/point_series/_fake_x_aspect'));

    function unwrap(res, def) {
      return res && res.value != null ? res.value : def;
    }

    function aspectFind(schemaName) {
      return function (column) {
        return column && column.aggConfig && column.aggConfig.schema && column.aggConfig.schema.name === schemaName;
      };
    }

    return function (vis, table) {
      var chart = {};
      var columns = table.columns;
      var rows = table.rows;

      // Row
      var iRow = _.findIndex(columns, aspectFind('row'));

      if (iRow === -1) {
        var fakeRowAspect = fakeXAspect(vis);
        iRow = columns.push(fakeRowAspect.col) - 1;
      }

      var rowAxis = columns[iRow];

      // Column
      var iCol = _.findIndex(columns, aspectFind('column'));

      if (iCol === -1) {
        var fakeColAspect = fakeXAspect(vis);
        iCol = columns.push(fakeColAspect.col) - 1;
      }

      var colAxis = columns[iCol];

      // Metric
      var iMetric = _.findIndex(columns, aspectFind('metric'));
      var metric = columns[iMetric];

      /*****
       * Build the chart
       *****/
      chart.columnLabel = colAxis.label;
      chart.rowLabel = rowAxis.label;
      chart.metricLabel = metric.label;
      chart.metricFormatter = table.fieldFormatter(metric);

      // aggregations for row and column
      var labelFormatters = [
        {
          axis: colAxis,
          agg: colAxis.aggConfig,
          name: 'columnFormatter',
          ordered: 'columnOrdered'
        },
        {
          axis: rowAxis,
          agg: rowAxis.aggConfig,
          name: 'rowFormatter',
          ordered: 'rowOrdered'
        }
      ];

      labelFormatters.forEach(function (obj) {
        var axis = obj.axis;
        var agg = obj.agg;
        var name = obj.name;

        chart[obj.ordered] = {};

        if (agg.type && agg.type.ordered && agg.type.ordered.date) {
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
          chart[obj.ordered] = agg.type && agg.type.ordered && {};
          if (agg.type !== false && axis && axis.params && axis.params.interval) {
            chart[obj.ordered].interval = axis.params.interval;
          }
        }
      });

      // setup the formatter for the label
      chart.tooltipFormatter = tooltipFormatter;

      var series = chart.series = [];
      var seriesByLabel = {};

      // TODO: Need to make vislib accept an empty series.
      if (rows.length === 0) {
        chart.hits = 0;
        chart.series.push({ values: [ { x: '_all', row: '_all', y: 0 } ] });
      }

      rows.forEach(function (row) {
        var seriesLabel = rowAxis && unwrap(row[iRow], '');
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
          x: unwrap(row[iCol], '_all'),
          row: unwrap(row[iRow], '_all'),
          y: unwrap(row[iMetric], 0)
        };

        // skip this datum
        if (datum.y == null) return;

        s.values.push(datum);
      });


      return chart;
    };
  };
});