define(function (require) {
  return function VislibVisTypeFactory(Private) {
    var _ = require('lodash');

    var VisTypeSchemas = Private(require('plugins/vis_types/_schemas'));
    var VisType = Private(require('plugins/vis_types/_vis_type'));
    var pointSeries = Private(require('components/agg_response/point_series/point_series'));
    var VislibRenderbot = Private(require('plugins/vis_types/vislib/_vislib_renderbot'));

    require('plugins/vis_types/controls/vislib_basic_options');
    require('plugins/vis_types/controls/point_series_options');
    require('plugins/vis_types/controls/line_interpolation_option');
    require('plugins/vis_types/controls/point_series_options');

    _(VislibVisType).inherits(VisType);
    function VislibVisType(opts) {
      opts = opts || {};

      VislibVisType.Super.call(this, opts);

      if (this.responseConverter == null) {
        this.responseConverter = pointSeries;
      }

      this.listeners = opts.listeners || {};
    }

    VislibVisType.prototype.createRenderbot = function (vis, $el) {
      return new VislibRenderbot(vis, $el);
    };

    return VislibVisType;
  };
});
