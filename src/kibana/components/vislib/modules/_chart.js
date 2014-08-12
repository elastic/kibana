define(function (require) {
  return function ChartBaseClass(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var ChartFunctions = Private(require('components/vislib/modules/_functions'));
//    var XAxis = Private(require('components/vislib/modules/XAxis'));
//    var YAxis = Private(require('components/vislib/modules/YAxis'));
    var renderChart = Private(require('components/vislib/components/_chart/_render'));
//    var legend = Private(require('components/vislib/modules/Legend'));
//    var tooltip = Private(require('components/vislib/modules/Tooltip'));

    _(Chart).inherits(ChartFunctions);
    function Chart(vis, el, chartData) {
      Chart.Super.apply(this, arguments);

      this.el = vis.el;
      this.ChartClass = vis.ChartClass;
      this.data = vis.data;
      this.color = vis.color;
      this.orderedKeys = vis.orderedKeys;

      // Chart specific items
      this.chartEl = el;
      this.chartData = chartData;
      this._attr = _.defaults(vis.config || {}, {});
    }

    Chart.prototype.render = function () {
      return this.draw();
    };

//    Chart.prototype.callXAxis = function () {
//      return new XAxis(this);
//    };
//
//    Chart.prototype.callYAxis = function () {
//      return new YAxis(this);
//    };
//
//    Chart.prototype.resize = _.debounce(function () {
//      if (!this.data) {
//        throw new Error('No valid data');
//      }
//      this.render(this.data);
//    }, 200);
//
//    Chart.prototype.checkSize = function () {
//      // enable auto-resize
//      var size = $('.chart').width() + ':' + $('.chart').height();
//
//      if (this.prevSize !== size) {
//        this.resize();
//      }
//      this.prevSize = size;
//      setTimeout(this.checkSize, 250);
//    };

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