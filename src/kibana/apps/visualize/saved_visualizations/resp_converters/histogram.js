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

    // when we don't have an x-axis, just push everything into '_all'
    if (iX === -1) {
      iX = columns.push({
        label: ''
      }) - 1;
    }

    chart.xAxisLabel = columns[iX].label;
    chart.xAxisFormatter = columns[iX].field.format.fn;

    chart.yAxisLabel = columns[iY].label;
    chart.yAxisFormatter = columns[iY].field && columns[iY].field.format.fn;

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
        x: row[iX] || '_all',
        y: row[iY === -1 ? row.length - 1 : iY] // y-axis value
      });
    });
  };
});