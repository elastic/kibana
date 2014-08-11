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

      return new this.ChartClass(this);
    }

    return Vis;
  };
});