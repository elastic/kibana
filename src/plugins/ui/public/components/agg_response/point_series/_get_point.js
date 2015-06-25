define(function (require) {
  return function PointSeriesGetPoint() {
    var _ = require('lodash');
    function unwrap(aggConfigResult, def) {
      return aggConfigResult ? aggConfigResult.value : def;
    }

    return function getPoint(x, series, yScale, row, y, z) {
      var zRow = z && row[z.i];
      var xRow = row[x.i];

      var point = {
        x: unwrap(xRow, '_all'),
        xi: xRow && xRow.$order,
        y: unwrap(row[y.i]),
        z: zRow && unwrap(zRow),
        aggConfigResult: row[y.i],
        extraMetrics: _.compact([zRow]),
        yScale: yScale
      };

      if (point.y === 'NaN' || point.y == null) {
        // filter out NaN from stats and null
        // from metrics that are not based at zero
        return;
      }

      if (series) {
        point.series = series.agg.fieldFormatter()(unwrap(row[series.i]));
      }

      if (yScale) {
        point.y *= yScale;
      }

      return point;
    };
  };
});
