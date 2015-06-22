define(function (require) {
  return function VislibVisTypeFactory(Private) {
    var _ = require('lodash');
    var VislibVisType = Private(require('plugins/vis_types/vislib/_vislib_vis_type'));
    var pointSeries = Private(require('components/agg_response/point_series/point_series'));

    _(PointSeriesVisType).inherits(VislibVisType);
    function PointSeriesVisType(opts) {
      opts = opts || {};
      opts.responseConverter = pointSeries;

      PointSeriesVisType.Super.call(this, opts);

      if (opts.seriesShouldBeInverted) {
        this.seriesShouldBeInverted = opts.seriesShouldBeInverted;
      }
    }

    /**
     * Helper method tells the point series response converter
     * if the series generated for each y-aggregation should be inverted
     * for better rendering. This is currently only the case in the area
     * chart when the series agg is sorted descending and the area is
     * in overlap mode.
     *
     * @param {Vis} vis - a visualization to test
     * @return {boolean}
     */
    PointSeriesVisType.prototype.seriesShouldBeInverted = function (vis) {
      return !vis && !!vis; // false, so vis is used
    };

    return PointSeriesVisType;
  };
});
