define(function (require) {
  return function VisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var ChartFunctions = Private(require('components/vislib/modules/_functions'));
    var split = Private(require('components/vislib/components/_functions/d3/_split'));

    var chartTypes = {
      histogram : Private(require('components/vislib/modules/ColumnChart')),
      legend: Private(require('components/vislib/modules/Legend')),
      tooltip: Private(require('components/vislib/modules/Tooltip'))
    };

    _(Vis).inherits(ChartFunctions);
    function Vis($el, config) {
      Vis.Super.apply(this, arguments);
      this.el = $el.get ? $el.get(0) : $el;
      this.config = config;
      this.ChartClass = chartTypes[config.type];
      this.prevSize;
    }

    Vis.prototype.render = function (data) {
      if (!data) {
        throw new Error('No valid data!');
      }

      this.data = this.injectZeros(data);
      this.orderedKeys = this.getOrderedKeys(this.data);

      this.labels = this.getLabels(this.data);
      this.color = this.getColor(this.labels);

      // clears the el
      this.removeAll(this.el);

      // add layout
      this.layout(this.el);

      // split data
      this.callFunction(d3.select('.chart-wrapper'), this.data, split);

      if (this.config.addLegend) {
        this.legend = new chartTypes.legend(this);
        this.legend.draw(this);
      }

      if (this.config.addTooltip) {
        this.tooltip = new chartTypes.tooltip(this);
      }

      var vis = this;
      var charts = this.charts = [];

      d3.select(this.el)
        .selectAll('.chart')
        .each(function (chartData) {
          var chart = new vis.ChartClass(vis, this, chartData);
          charts.push(chart);
          chart.render();
        });

      this.checkSize('.vis-col-wrapper');
    };

    Vis.prototype.resize = function () {
      if (!this.data) {
        throw new Error('No valid data');
      }
      this.render(this.data);
    };

    Vis.prototype.checkSize = _.debounce(function (el) {
      // enable auto-resize
      var size = $(el).width() + ':' + $(el).height();
      console.log(size);

      if (this.prevSize !== undefined && this.prevSize !== size) {
        this.resize();
      }
      this.prevSize = size;
      setTimeout(this.checkSize(el), 500);
    }, 500);

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