define(function (require) {
  return function VislibRenderbotFactory(Private, vislib) {
    var _ = require('lodash');
    var Renderbot = Private(require('plugins/vis_types/_renderbot'));
    var normalizeChartData = Private(require('components/agg_response/index'));

    _(VislibRenderbot).inherits(Renderbot);
    function VislibRenderbot(vis, $el) {
      VislibRenderbot.Super.call(this, vis, $el);
      this.vislibVis = {};
      this._createVis();
    }

    VislibRenderbot.prototype._createVis = function () {
      var self = this;

      self.vislibParams = _.assign(
        {},
        self.vis.type.params.defaults,
        { type: self.vis.type.name },
        self.vis.params
      );

      self.vislibVis = new vislib.Vis(self.$el[0], self.vislibParams);

      _.each(self.vis.listeners, function (listener, event) {
        self.vislibVis.on(event, listener);
      });
    };

    VislibRenderbot.prototype.render = function (esResponse) {
      var self = this;

      var buildChartData = normalizeChartData.flat;
      if (self.vis.type.hierarchicalData) {
        buildChartData = normalizeChartData.hierarchical;
      }

      var chartData = buildChartData(self.vis, esResponse);
      self.vislibVis.render(chartData);
    };

    VislibRenderbot.prototype.destroy = function () {
      var self = this;

      var vislibVis = self.vislibVis;

      _.forOwn(self.vis.listeners, function (listener, event) {
        vislibVis.off(event, listener);
      });

      vislibVis.destroy();
    };

    VislibRenderbot.prototype.updateParams = function (params) {
      if (!_.isEqual(params, this.vislibParams)) this._createVis(params);
    };

    return VislibRenderbot;
  };
});
