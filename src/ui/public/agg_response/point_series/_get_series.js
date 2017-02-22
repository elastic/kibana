import _ from 'lodash';
import AggResponsePointSeriesGetPointProvider from 'ui/agg_response/point_series/_get_point';
import AggResponsePointSeriesAddToSiriProvider from 'ui/agg_response/point_series/_add_to_siri';
export default function PointSeriesGetSeries(Private) {
  const getPoint = Private(AggResponsePointSeriesGetPointProvider);
  const addToSiri = Private(AggResponsePointSeriesAddToSiriProvider);

  return function getSeries(rows, chart) {
    const aspects = chart.aspects;
    const multiY = _.isArray(aspects.y);
    const yScale = chart.yScale;
    const partGetPoint = _.partial(getPoint, aspects.x, aspects.series, yScale);

    let series = _(rows)
    .transform(function (series, row) {
      if (!multiY) {
        const point = partGetPoint(row, aspects.y, aspects.z);
        if (point) addToSiri(series, point, point.series, point.series, aspects.y.agg);
        return;
      }

      aspects.y.forEach(function (y) {
        const point = partGetPoint(row, y, aspects.z);
        if (!point) return;

        // use the point's y-axis as it's series by default,
        // but augment that with series aspect if it's actually
        // available
        let seriesId = y.agg.id;
        let seriesLabel = y.col.title;

        if (aspects.series) {
          const prefix = point.series ? point.series + ': ' : '';
          seriesId = prefix + seriesId;
          seriesLabel = prefix + seriesLabel;
        }

        addToSiri(series, point, seriesId, seriesLabel, y.agg);
      });

    }, new Map())
    .thru(series => [...series.values()])
    .value();

    if (multiY) {
      series = _.sortBy(series, function (siri) {
        const firstVal = siri.values[0];
        let y;

        if (firstVal) {
          const agg = firstVal.aggConfigResult.aggConfig;
          y = _.find(aspects.y, function (y) {
            return y.agg === agg;
          });
        }

        return y ? y.i : series.length;
      });
    }

    return series;
  };
}
