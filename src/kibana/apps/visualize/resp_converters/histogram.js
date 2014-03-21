define(function (require) {
  var _ = require('lodash');

  return function (columns, rows) {
    var serieses = [];
    var seriesesByLabel = {};

    // index of color
    var iColor = _.findIndex(columns, { categoryName: 'group' });
    // index of x-axis
    var iX = _.findIndex(columns, { categoryName: 'segment'});
    // index of y-axis
    var iY = _.findIndex(columns, { categoryName: 'metric'});

    rows.forEach(function (row) {
      var series = seriesesByLabel[iColor === -1 ? 'undefined' : row[iColor]];

      if (!series) {
        series = {
          label: '' + row[iColor],
          children: []
        };
        serieses.push(series);
        seriesesByLabel[series.label] = series;
      }

      series.children.push([
        row[iX], // x-axis value
        row[iY === -1 ? row.length - 1 : iY] // y-axis value
      ]);
    });

    return serieses;
  };
});