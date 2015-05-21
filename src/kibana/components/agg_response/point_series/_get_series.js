define(function (require) {
  return function PointSeriesGetSeries(Private) {
    var _ = require('lodash');
    var getPoint = Private(require('components/agg_response/point_series/_get_point'));

    return function getSeries(rows, chart, vis) {
      var aspects = chart.aspects;
      var yScale = chart.yScale;
      var invertBuckets = vis.type.seriesShouldBeInverted(vis);

      // collect the y value for a y-aspect from all of the rows
      // and produce an array of siris.
      function collect(y) {
        var seriesMap = {};
        var series = [];

        rows.forEach(function (row) {
          var point = getPoint(aspects.x, aspects.series, yScale, row, y, aspects.z);
          if (!point) return;

          var subSeries = point.series == null ? '' : point.series + '';
          var siriId = subSeries + (y.title && subSeries ? ': ' : '') + y.title;
          var siri = seriesMap[siriId];

          if (!siri) {
            siri = seriesMap[siriId] = {
              label: siriId,
              values: [point]
            };
            series.push(siri);
          } else {
            siri.values.push(point);
          }
        });

        if (invertBuckets) series.reverse();
        return series;
      }

      if (!_.isArray(aspects.y)) {
        return collect(aspects.y);
      } else {
        return _(aspects.y)
        .sortBy('i')
        .map(collect)
        .flatten(true)
        .value();
      }
    };
  };
});
