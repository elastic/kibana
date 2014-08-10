define(function (require) {
  return function VisFactory(d3, Private) {

    var chartTypes = {
      histogram : Private(require('components/vislib/modules/ColumnChart')),
      legend : Private(require('components/vislib/modules/Legend')),
      tooltip : Private(require('components/vislib/modules/Tooltip'))
    };

    function Vis($el, config) {
      this.el = $el.get ? $el.get(0) : $el;
      this.config = config;
      this.ChartClass = chartTypes[config.type];
    }

    Vis.prototype.render = function (data) {
      if (!data) {
        throw new Error('No data provided');
      }
      this.data = data;

      this.chart = new this.ChartClass(this);
      this.chart.render(this);
    };

    Vis.prototype.resize = function () {
      return this.chart.resize();
    };

//    Vis.prototype.on = function () {
//      return this.chart.on();
//    };
//
//    Vis.prototype.off = function () {
//      return this.chart.off();
//    };
//
//    Vis.prototype.destroy = function () {
//      return this.chart.destroy();
//    };

    Vis.prototype.set = function (name, val) {
      return this.chart.set(name, val);
    };

    Vis.prototype.get = function (name) {
      return this.chart.get(name);
    };

    return Vis;
  };
});