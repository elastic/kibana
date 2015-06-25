define(function (require) {
  return function PointSeriesGetSeries(Private) {
    var _ = require('lodash');
    var getPoint = Private(require('components/agg_response/point_series/_get_point'));
    var addToSiri = Private(require('components/agg_response/point_series/_add_to_siri'));

    return function getSeries(rows, chart) {
      var aspects = chart.aspects;
      var multiY = _.isArray(aspects.y);
      var yScale = chart.yScale;
      var partGetPoint = _.partial(getPoint, aspects.x, aspects.series, yScale);

      var series = _(rows)
      .transform(function (series, row) {

        if (!multiY) {
          var point = partGetPoint(row, aspects.y, aspects.z);
          if (point) addToSiri(series, point, point.series);
          return;
        }

        aspects.y.forEach(function (y) {
          var point = partGetPoint(row, y, aspects.z);
          if (!point) return;

          var prefix = point.series ? point.series + ': ' : '';
          var seriesId = prefix + y.agg.id;
          var seriesLabel = prefix + y.col.title;

          addToSiri(series, point, seriesId, seriesLabel);
        });

      }, {})
      .values()
      .value();

      if (multiY) {
        series = _.sortBy(series, function (siri) {
          var firstVal = siri.values[0];
          var y;

          if (firstVal) {
            var agg = firstVal.aggConfigResult.aggConfig;
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
