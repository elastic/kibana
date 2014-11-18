define(function (require) {
  return function SeriesDataTooltip($compile, $rootScope) {
    function readRows(table, index, chart, col) {
      var seriesByLabel = {};

      function seriesForRow(row) {
        if (!chart.series) chart.series = [];

        var series;

        if (col.group) {
          var seriesLabel = String(row[index.group]);
          series = seriesByLabel[seriesLabel];
          if (!series) {
            series = seriesByLabel[seriesLabel] = {
              label: seriesLabel,
              values: []
            };
            chart.series.push(series);
          }
        }

        if (!series) series = chart.series[0];
        if (!series) {
          series = {
            values: []
          };
          chart.series.push(series);
        }

        return series;
      }

      function forEachRow(row) {
        var x = (row[index.x] == null) ? '_all' : row[index.x];

        var y = row[index.y === -1 ? row.length - 1 : index.y];
        // skip datum that don't have a y value
        if (y == null) return;
        // scale y values based on the chart's yScale (determined by aggs)
        if (chart.yScale) {
          y = y * chart.yScale;
        }

        var series = seriesForRow(row);
        series.values.push({
          x: x,
          y: y
        });
      }

      table.rows.forEach(forEachRow);
    }

    return readRows;
  };
});
