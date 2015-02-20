define(function (require) {
  return function PointSeriesGetPoint() {
    function unwrap(aggConfigResult, def) {
      return aggConfigResult ? aggConfigResult.value : def;
    }

    return function getPoint(x, series, yScale, row, y, radius) {
      var point = {
        x: unwrap(row[x.i], '_all'),
        y: unwrap(row[y.i]),
        radius: unwrap(row[(radius || {}).i]),
        aggConfigResult: row[y.i],
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
