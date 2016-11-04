import _ from 'lodash';
export default function PointSeriesGetPoint() {
  function unwrap(aggConfigResult, def) {
    return aggConfigResult ? aggConfigResult.value : def;
  }

  return function getPoint(x, series, yScale, row, y, z) {
    const zRow = z && row[z.i];
    const xRow = row[x.i];

    const point = {
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
    } else if (y) {
      // If the data is not split up with a series aspect, then
      // each point's "series" becomes the y-agg that produced it
      point.aggConfig = y.col.aggConfig;
      point.series = y.col.title;
    }

    if (yScale) {
      point.y *= yScale;
    }

    return point;
  };
}
