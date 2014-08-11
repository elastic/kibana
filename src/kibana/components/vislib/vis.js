define(function (require) {
  return function VisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var ChartFunctions = Private(require('components/vislib/modules/_functions'));
    var split = Private(require('components/vislib/components/_functions/d3/_split'));
    var breakData = Private(require('components/vislib/components/_functions/labels/data_array'));

    var chartTypes = {
      histogram : Private(require('components/vislib/modules/ColumnChart'))
    };

    _(Vis).inherits(ChartFunctions);
    function Vis($el, config) {
      Vis.Super.apply(this, arguments);
      this.el = $el.get ? $el.get(0) : $el;
      this.config = config;
      this.ChartClass = chartTypes[config.type];
      this.checkSize = _.bindKey(this, 'checkSize');
      this.resize = _.bindKey(this, 'resize');
      this.prevSize;
    }

    Vis.prototype.render = function (data) {
      if (!data) {
        throw new Error('No valid data!');
      }

      this.data = data;
      console.log(this.data);
      this.zeroFilledData = this.injectZeros(breakData(this.data));
      console.log(this.zeroFilledData);

      this.labels = this.getLabels(this.data);
      this.color = this.getColor(this.labels);

      // clears the el
      this.removeAll(this.el);

      // add layout
      this.layout(this.el);

      // split data
      this.callFunction(d3.select('.chart-wrapper'), this.data, split);

      var vis = this;
      var charts = this.charts = [];

      d3.select(this.el)
        .selectAll('.chart')
        .each(function (chartData) {
          var chart = new vis.ChartClass(vis, this, chartData);
          charts.push(chart);
          chart.render();
        });
    };

    Vis.prototype.resize = _.debounce(function () {
      if (!this.data) {
        throw new Error('No valid data');
      }
      this.render(this.data);
    }, 200);

    Vis.prototype.checkSize = function () {
      // enable auto-resize
      var size = $(this.el).width() + ':' + $(this.el).height();

      if (this.prevSize !== size) {
        this.resize();
      }
      this.prevSize = size;
    };

    Vis.prototype.on = function () {
      return this.chart.on();
    };

    Vis.prototype.off = function () {
      return this.chart.off();
    };

    Vis.prototype.destroy = function () {
      return this.chart.destroy();
    };

    Vis.prototype.set = function (name, val) {
      return this.chart.set(name, val);
    };

    Vis.prototype.get = function (name) {
      return this.chart.get(name);
    };

    return Vis;
  };
});