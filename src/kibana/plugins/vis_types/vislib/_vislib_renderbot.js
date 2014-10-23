define(function (require) {
  return function VislibRenderbotFactory(Private, vislib) {
    var _ = require('lodash');
    var Renderbot = Private(require('plugins/vis_types/_renderbot'));
    var normalizeChartData = Private(require('components/agg_response/index'));

    _(VislibRenderbot).inherits(Renderbot);
    function VislibRenderbot(vis, $el) {
      VislibRenderbot.Super.call(this, vis, $el);

      var self = this;

      var vislibParams = _.assign(
        {},
        vis.type.vislibParams,
        { type: vis.type.name },
        vis.vislibParams
      );

      self.vislibVis = new vislib.Vis($el[0], vislibParams);

      _.each(vis.listeners, function (listener, event) {
        self.vislibVis.on(event, listener);
      });
    }

    VislibRenderbot.prototype.render = function (esResponse) {
      var buildChartData = normalizeChartData.flat;
      if (this.vis.type.hierarchicalData) {
        buildChartData = normalizeChartData.hierarchical;
      }

      var chartData = buildChartData(this.vis, esResponse);
      this.vislibVis.render(chartData);
    };

    VislibRenderbot.prototype.destroy = function () {
      var vislibVis = this.vislibVis;

      _.forOwn(this.vis.listeners, function (listener, event) {
        vislibVis.off(event, listener);
      });

      vislibVis.destroy();
    };

    return VislibRenderbot;
  };
});
