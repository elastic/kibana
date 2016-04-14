define(function (require) {
  return function PointSeriesGetSeries(Private) {
    let _ = require('lodash');
    let getPoint = Private(require('ui/agg_response/point_series/_get_point'));
    let addToSiri = Private(require('ui/agg_response/point_series/_add_to_siri'));

    return function getSeries(rows, chart) {
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

      return series;
    };
  };
});
