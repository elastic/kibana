define(function (require) {
  return function VisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var VisFunctions = Private(require('components/vislib/modules/_functions'));
    var Events = Private(require('factories/events'));

    // VisLib Visualization Types
    var chartTypes = {
      histogram : Private(require('components/vislib/modules/ColumnChart'))
    };

//    _(Vis).inherits(Events);
    function Vis($el, config) {
//      Vis.Super.apply(this, arguments);
      this.el = $el.get ? $el.get(0) : $el;
      this.ChartClass = chartTypes[config.type];
      this._attr = _.defaults(config || {}, {
        'margin' : { top: 6, right: 0, bottom: 0, left: 0 }
      });
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
      if (this._attr.addLegend) {
        legend = {
          color: this.data.getColorFunc(),
          labels: this.data.getLabels()
        };
        this.renderLegend(legend, this._attr);
      }

      // TOOLTIP CLASS
      if (this._attr.addTooltip) {
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
      this.renderXAxis(xValues, formatter, width, this._attr.margin);

      // YAXIS CLASS
      yMax = this.data.getYMaxValue();
      height = $('.y-axis-div').height();
      this.renderYAxis(yMax, height, this._attr.margin);

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

//    Vis.prototype.on = function () {
//      return this.charts.on.apply(this.charts, arguments);
//    };

//    Vis.prototype.off = function () {
//      return this.charts.off.apply(this.charts, arguments);
//    };

    Vis.prototype.destroy = function () {
      return this.ChartClass.prototype.destroy.apply(this, arguments);
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