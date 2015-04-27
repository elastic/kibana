define(function (require) {
  return function VislibRenderbotFactory(Private, vislib) {
    var _ = require('lodash');
    var Renderbot = Private(require('plugins/vis_types/_renderbot'));
    var buildChartData = Private(require('plugins/vis_types/vislib/_build_chart_data'));

    _(VislibRenderbot).inherits(Renderbot);
    function VislibRenderbot(vis, $el) {
      VislibRenderbot.Super.call(this, vis, $el);
      this._createVis();
    }

    VislibRenderbot.prototype._createVis = function () {
      var self = this;

      if (self.vislibVis) self.destroy();

      self.vislibParams = self._getVislibParams();
      self.vislibVis = new vislib.Vis(self.$el[0], self.vislibParams);

      self.vis.type.initVis(self.vis, self.vislibVis);

      if (self.vis.type.create) {
        self.vis.type.create(self.vis);
      }
    };

    VislibRenderbot.prototype._getVislibParams = function () {
      var self = this;

      return _.assign(
        {},
        self.vis.type.params.defaults,
        { type: self.vis.type.name },
        self.vis.params
      );
    };

    VislibRenderbot.prototype.buildChartData = buildChartData;
    VislibRenderbot.prototype.render = function (esResponse) {
      var chartData = this.buildChartData(esResponse);
      this.vislibVis.render(chartData);
    };

    VislibRenderbot.prototype.destroy = function () {
      var self = this;

      var vislibVis = self.vislibVis;

      if (self.vis.type.destroy) {
        self.vis.type.destroy(self.vis);
      }

      self.vis.type.destroyVis(self.vis, self.vislibVis);

      vislibVis.destroy();
    };

    VislibRenderbot.prototype.updateParams = function () {
      var self = this;

      // get full vislib params object
      var newParams = self._getVislibParams();

      // if there's been a change, replace the vis
      if (!_.isEqual(newParams, self.vislibParams)) self._createVis();
    };

    return VislibRenderbot;
  };
});
