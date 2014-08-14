define(function (require) {
  return function VisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    // VisLib Objects
    var Data = Private(require('components/vislib/modules/Data'));
    var Tooltip = Private(require('components/vislib/modules/Tooltip'));
    var XAxis = Private(require('components/vislib/modules/Xaxis'));
    var YAxis = Private(require('components/vislib/modules/YAxis'));
    var Legend = Private(require('components/vislib/modules/Legend'));

    var ChartFunctions = Private(require('components/vislib/modules/_functions'));
    var split = Private(require('components/vislib/components/_functions/d3/_split'));

    var chartTypes = {
      histogram : Private(require('components/vislib/modules/ColumnChart'))
    };

    function Vis($el, config) {
      this.el = $el.get ? $el.get(0) : $el;
      this.config = config;
      this.ChartClass = chartTypes[config.type];
    }

    _(Vis.prototype).extend(ChartFunctions.prototype);

    Vis.prototype.render = function (data) {
      var color;
      var labels;
      var tooltipFormatter;
      var zeroInjectedData;

      if (!data) {
        throw new Error('No valid data!');
      }

      this.data = new Data(data);
      zeroInjectedData = this.data.injectZeros();
      color = this.data.color ? this.data.color : this.data.getColorFunc();
      labels = this.data.labels ? this.data.labels : this.data.getLabels();
      tooltipFormatter = this.data.tooltipFormatter ? this.data.tooltipFormatter :
        this.data.get('tooltipFormatter');

      // clears the el
      this.removeAll(this.el);

      // add layout
      this.layout(this.el);

      // split data
      this.callFunction(d3.select('.chart-wrapper'), zeroInjectedData, split);

      if (this.config.addLegend && !this.legend) {
        this.legend = new Legend({
          class: 'legend-col-wrapper',
          color: color,
          labels: labels
        });
        this.legend.draw();
      }

      if (this.config.addTooltip && !this.tooltip) {
        this.tooltip = new Tooltip('k4tip', tooltipFormatter);
      }

      if (!this.charts) {
        var vis = this;
        var charts = this.charts = [];

        d3.select(this.el)
          .selectAll('.chart')
          .each(function (chartData) {
            var chart = new vis.ChartClass(vis, this, chartData);
            charts.push(chart);
            chart.render();
          });
      }

      if (!this.xAxis) {
        this.xAxis = new XAxis(this.data);
        this.xAxis.draw();
      }

      if (!this.yAxis) {
        this.yAxis = new YAxis(this.data);
        this.yAxis.draw();
      }

      this.checkSize('.chart');
    };

    Vis.prototype.resize = function () {
      if (!this.data.data) {
        throw new Error('No valid data');
      }
      this.render(this.data.data);
    };

    Vis.prototype.checkSize = _.debounce(function (el) {
      // enable auto-resize
      var size = $(el).width() + ':' + $(el).height();

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