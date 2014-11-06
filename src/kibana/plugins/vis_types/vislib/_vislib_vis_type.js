define(function (require) {
  require('plugins/vis_types/controls/vislib_basic_options');

  return function VislibVisTypeFactory(Private) {
    var _ = require('lodash');

    var VisTypeSchemas = Private(require('plugins/vis_types/_schemas'));
    var VisType = Private(require('plugins/vis_types/_vis_type'));
    var histogramConverter = Private(require('plugins/vis_types/vislib/converters/histogram'));
    var VislibRenderbot = Private(require('plugins/vis_types/vislib/_vislib_renderbot'));

    _(VislibVisType).inherits(VisType);
    function VislibVisType(opts) {
      opts = opts || {};

      VislibVisType.Super.call(this, opts);

      this.responseConverter = this.responseConverter || histogramConverter;
      this.hierarchicalData = opts.hierarchicalData || false;
      this.listeners = opts.listeners || {};
    }

    VislibVisType.prototype.createRenderbot = function (vis, $el) {
      return new VislibRenderbot(vis, $el);
    };

    return VislibVisType;
  };
});
