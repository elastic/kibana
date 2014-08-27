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

    _(Vis).inherits(Events);
    function Vis($el, config) {

      if (!(this instanceof Vis)) {
        return new Vis($el, config);
      }

      Vis.Super.apply(this, arguments);
      this.el = $el.get ? $el.get(0) : $el;
      this.ChartClass = chartTypes[config.type];
      this._attr = _.defaults(config || {}, {
        'margin' : { top: 10, right: 3, bottom: 5, left: 3 }
      });
    }

    _(Vis.prototype).extend(VisFunctions.prototype);

    Vis.prototype.render = function (data) {
      var tooltipFormatter;
      var zeroInjectedData;
      var type;
      var legend;
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
        this.renderLegend(legend, this._attr, this.el);
      }

      // TOOLTIP CLASS
      if (this._attr.addTooltip) {
        tooltipFormatter = this.data.get('tooltipFormatter');
        this.renderTooltip('k4tip', tooltipFormatter);
      }

      // CHART TITLE CLASS
      this.renderChartTitles();

      // XAXIS CLASS
      this.renderXAxis({
        el: this.el,
        data: this.data,
        attr: this._attr
      });

      // YAXIS CLASS
      this.renderYAxis({
        el: this.el,
        yMax: this.data.getYMaxValue(),
        attr: this._attr
      });

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
      console.log('resized');
    };

    Vis.prototype.checkSize = _.debounce(function () {
      // enable auto-resize
      var size = $('.chart').width() + ':' + $('.chart').height();

      if (this.prevSize !== size) {
        this.resize();
      }
      this.prevSize = size;
      setTimeout(this.checkSize(), 250);
    }, 250);

    Vis.prototype.destroy = function () {
      this._attr.destroyFlag = true;

      // Removing chart and all elements associated with it
      d3.select(this.el).selectAll('*').remove();

      // Cleaning up event listeners
      this.off('click');
      this.off('hover');
      this.off('brush');
      d3.select(window)
        .on('resize', null);
    };

    Vis.prototype.set = function (name, val) {
      this._attr[name] = val;
      this.render();
    };

    Vis.prototype.get = function (name) {
      return this._attr[name];
    };

    return Vis;
  };
});