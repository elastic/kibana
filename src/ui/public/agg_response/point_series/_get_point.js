define(function (require) {
  return function PointSeriesGetPoint() {
    let _ = require('lodash');
    function unwrap(aggConfigResult, def) {
      return aggConfigResult ? aggConfigResult.value : def;
    }

    return function getPoint(x, series, yScale, row, y, z) {
      let zRow = z && row[z.i];
      let xRow = row[x.i];

      let point = {
        x: unwrap(xRow, '_all'),
        xi: xRow && xRow.$order,
        y: unwrap(row[y.i]),
        z: zRow && unwrap(zRow),
        aggConfigResult: row[y.i],
        extraMetrics: _.compact([zRow]),
        yScale: yScale
      };

      if (point.y === 'NaN') {
        // filter out NaN from stats
        // from metrics that are not based at zero
        return;
      }

      if (series) {
        point.aggConfig = series.agg;
        point.series = series.agg.fieldFormatter()(unwrap(row[series.i]));
      }

      if (yScale) {
        point.y *= yScale;
      }

      return point;
    };
  };
});
