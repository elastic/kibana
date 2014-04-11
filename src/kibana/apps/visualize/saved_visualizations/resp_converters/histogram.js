define(function (require) {
  var _ = require('lodash');

  return function (chart, columns, rows) {
    // index of color
    var iColor = _.findIndex(columns, { categoryName: 'group' });
    var hasColor = iColor !== -1;

    // index of x-axis
    var iX = _.findIndex(columns, { categoryName: 'segment'});
    // index of y-axis
    var iY = _.findIndex(columns, { categoryName: 'metric'});

    chart.xAxisLabel = columns[iX].label;
    chart.yAxisLabel = columns[iY].label;

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

      s.values.push({
        x: row[iX],
        y: row[iY === -1 ? row.length - 1 : iY] // y-axis value
      });
    });
  };
});