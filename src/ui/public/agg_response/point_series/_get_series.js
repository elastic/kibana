import _ from 'lodash';
import AggResponsePointSeriesGetPointProvider from 'ui/agg_response/point_series/_get_point';
import AggResponsePointSeriesAddToSiriProvider from 'ui/agg_response/point_series/_add_to_siri';
export default function PointSeriesGetSeries(Private) {
  let getPoint = Private(AggResponsePointSeriesGetPointProvider);
  let addToSiri = Private(AggResponsePointSeriesAddToSiriProvider);

  function showLabelCount(vis) {
    if (!vis || !vis.params || !vis.params.addLegendCount) return false;
    if (!vis.type.params.isLegendCountSupported) return false;
    return true;
  }
  return function getSeries(rows, chart, vis) {
    let aspects = chart.aspects;
    let multiY = _.isArray(aspects.y);
    let yScale = chart.yScale;
    let partGetPoint = _.partial(getPoint, aspects.x, aspects.series, yScale);

    let series = _(rows)
    .transform(function (series, row) {
      if (!multiY) {
        let point = partGetPoint(row, aspects.y, aspects.z);
        if (point) addToSiri(series, point, point.series);
        return;
      }

      aspects.y.forEach(function (y) {
        let point = partGetPoint(row, y, aspects.z);
        if (!point) return;

        let prefix = point.series ? point.series + ': ' : '';
        let seriesId = prefix + y.agg.id;
        let seriesLabel = prefix + y.col.title;

        addToSiri(series, point, seriesId, seriesLabel);
      });

    }, new Map())
    .thru(series => [...series.values()])
    .value();

    if (multiY) {
      series = _.sortBy(series, function (siri) {
        let firstVal = siri.values[0];
        let y;

        if (firstVal) {
          let agg = firstVal.aggConfigResult.aggConfig;
          y = _.find(aspects.y, function (y) {
            return y.agg === agg;
          });
        }

        return y ? y.i : series.length;
      });
    }

    series = _.map(series, siri => {
      if (siri.values.length === 0) return siri;
      if (siri.values[0].aggConfigResult.aggConfig._opts.type !== 'count') return siri;
      const count = siri.values.reduce((prev, curr) => prev + curr.y, 0);
      if (showLabelCount(vis)) {
        siri.legendLabel = `${siri.label} (${count})`;
      } else {
        siri.legendLabel = siri.label;
      }
      return siri;
    });

    return series;
  };
};
