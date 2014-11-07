define(function (require) {
  return function VislibRenderbotFactory(Private, vislib) {
    var _ = require('lodash');
    var Renderbot = Private(require('plugins/vis_types/_renderbot'));
    var normalizeChartData = Private(require('components/agg_response/index'));
    var NotEnoughData = require('errors').NotEnoughData;

    _(VislibRenderbot).inherits(Renderbot);
    function VislibRenderbot(vis, $el) {
      VislibRenderbot.Super.call(this, vis, $el);
      this.vislibVis = {};
      this._normalizers = {
        flat: normalizeChartData.flat,
        hierarchical: normalizeChartData.hierarchical
      };
      this._createVis();
    }

    VislibRenderbot.prototype._createVis = function () {
      var self = this;

      self.vislibParams = self._getVislibParams();
      self.vislibVis = new vislib.Vis(self.$el[0], self.vislibParams);

      _.each(self.vis.listeners, function (listener, event) {
        self.vislibVis.on(event, listener);
      });
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

    VislibRenderbot.prototype.render = function (esResp) {
      var self = this;

      if (!esResp.hits.total) {
        throw new NotEnoughData(esResp);
      }

      var buildChartData = self._normalizers.flat;
      if (self.vis.type.hierarchicalData) {
        buildChartData = self._normalizers.hierarchical;
      }

      var chartData = buildChartData(self.vis, esResp);

      [
        chartData.raw.rows || [],
        chartData.rows,
        chartData.columns,
        chartData.slices
      ]
      .forEach(function (arr) {
        if (arr && !_.size(arr)) throw new NotEnoughData(esResp);
      });

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
