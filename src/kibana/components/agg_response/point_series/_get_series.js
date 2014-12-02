define(function (require) {
  return function PointSeriesGetSeries(Private) {
    var _ = require('lodash');
    var getPoint = Private(require('components/agg_response/point_series/_get_point'));
    var addToSiri = Private(require('components/agg_response/point_series/_add_to_siri'));

    return function getSeries(rows, chart) {
      var aspects = chart.aspects;
      var x = aspects.x;
      var y = aspects.y;
      var series = aspects.series;
      var multiY = _.isArray(y);
      var yScale = chart.yScale;
      var partGetPoint = _.partial(getPoint, x, series, yScale);

      return _(rows)
      .transform(function (series, row) {

        if (!multiY) {
          var point = partGetPoint(row, y);
          addToSiri(series, point, point.series);
          return;
        }

        y.forEach(function (y) {
          var point = partGetPoint(row, y);
          var prefix = point.series ? point.series + ': ' : '';
          var seriesId = prefix + y.agg.id;
          var seriesLabel = prefix + y.col.title;
          addToSiri(series, point, seriesId, seriesLabel);
        });

      }, {})
      .values()
      .value();
    };
  };
});
