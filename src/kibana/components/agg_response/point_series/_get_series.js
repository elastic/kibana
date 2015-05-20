define(function (require) {
  return function PointSeriesGetSeries(Private) {
    var _ = require('lodash');
    var getPoint = Private(require('components/agg_response/point_series/_get_point'));

    return function getSeries(rows, chart, vis) {
      var aspects = chart.aspects;
      var yScale = chart.yScale;

      // the area vis has an overlap mode, which requires that "large" series
      // be rendered last or else they will hide the "small" series. Since we
      // since the size of a series is very subjective, we simply invert the
      // values created by a series if it is sorted descending.
      var areaVis = _.get(vis, 'type.name') === 'area';
      var areaOverlapping = areaVis && _.get(vis, 'params.mode') === 'overlap';
      var seriesDesc = _.get(aspects, 'series.agg.params.order.val') === 'desc';
      var invertBuckets = areaOverlapping && seriesDesc;

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
