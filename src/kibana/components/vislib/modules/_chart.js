define(function (require) {
  return function ChartBaseClass(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var ChartFunctions = Private(require('components/vislib/modules/_functions'));
    var renderChart = Private(require('components/vislib/utils/d3/_chart/_render'));

    _(Chart).inherits(ChartFunctions);
    function Chart(vis) {
      Chart.Super.apply(this, arguments);
      this.el = vis.el;
      this.data = vis.data;
      this.callXAxis = vis.callXAxis;
      this.ChartClass = vis.ChartClass;
      this.labels = this.getLabels(this.data);
      this.color = this.color(this.labels);
      this._attr = _.defaults(vis.config || {}, {});
    }

    Chart.prototype.render = function () {
      return renderChart(this);
    };

    Chart.prototype.checkSize = function (el) {
      // enable auto-resize
      var size = $(el).width() + ':' + $(el).height();

      if (this.prevSize !== size) {
        this.resize();
      }
      this.prevSize = size;
      setTimeout(this.checkSize, 250);
    };

    Chart.prototype.resize = _.debounce(function () {
      if (!this.data) {
        throw new Error('No valid data');
      }
      this.render();
    }, 200);

    Chart.prototype.on = function () {};
    Chart.prototype.off = function () {};
    Chart.prototype.destroy = function () {};

    Chart.prototype.set = function (name, val) {
      this._attr[name] = val;
      this.render();
    };

    Chart.prototype.get = function (name) {
      return this._attr[name];
    };

    return Chart;
  };
});