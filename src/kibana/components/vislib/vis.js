define(function (require) {
  return function VisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var VisFunctions = Private(require('components/vislib/modules/_functions'));

    // VisLib Visualization Types
    var chartTypes = {
      histogram : Private(require('components/vislib/modules/ColumnChart'))
    };

    function Vis($el, config) {
      this.el = $el.get ? $el.get(0) : $el;
      this.config = config;
      this.ChartClass = chartTypes[config.type];
    }

    _(Vis.prototype).extend(VisFunctions.prototype);

    Vis.prototype.render = function (data) {
      var tooltipFormatter;
      var zeroInjectedData;
      var type;
      var legend;
      var xValues;
      var formatter;
      var width;
      var yMax;
      var height;
      var xTitle;
      var yTitle;
      var vis;
      var charts;

      if (!data) {
        throw new Error('No valid data!');
      }

      // DATA CLASS
      this.instantiateData(data);

      // LAYOUT CLASS
      zeroInjectedData = this.data.injectZeros();
      this.renderLayout(zeroInjectedData);

      // LEGEND CLASS
      if (this.config.addLegend) {
        legend = {
          color: this.data.getColorFunc(),
          labels: this.data.getLabels()
        };
        this.renderLegend(legend, this.config);
      }

      // TOOLTIP CLASS
      if (this.config.addTooltip) {
        tooltipFormatter = this.data.get('tooltipFormatter');
        this.renderTooltip('k4tip', tooltipFormatter);
      }

      // CHART TITLE CLASS
      type = this.data.splitType();
      this.renderChartTitles(type);

      // XAXIS CLASS
      xValues = this.data.xValues();
      formatter = this.data.get('xAxisFormatter');
      width = $('.x-axis-div').width();
      this.renderXAxis(xValues, formatter, width);

      // YAXIS CLASS
      yMax = this.data.getYMaxValue();
      height = $('.y-axis-div').height();
      this.renderYAxis(yMax, height);

      // AXIS TITLE CLASS
      xTitle = this.data.get('xAxisLabel');
      yTitle = this.data.get('yAxisLabel');
      this.renderAxisTitles(xTitle, yTitle);

      // CHART CLASS
      vis = this;
      charts = this.charts = [];
      this.renderCharts(vis, charts);

      this.checkSize();
    };

    Vis.prototype.resize = function () {
      if (!this.data.data) {
        throw new Error('No valid data');
      }
      this.render(this.data.data);
    };

    Vis.prototype.checkSize = _.debounce(function () {
      // enable auto-resize
      var size = $('.chart').width() + ':' + $('.chart').height();

      if (this.prevSize !== size) {
        this.resize();
      }
      this.prevSize = size;
      setTimeout(this.checkSize(), 300);
    }, 300);

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