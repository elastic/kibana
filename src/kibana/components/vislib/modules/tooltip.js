define(function (require) {
  return function TooltipFactory(d3, Private) {
    var _ = require('lodash');

    var renderTooltip = Private(require('components/vislib/components/Tooltip/tooltip'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    function Tooltip(className, formatter) {
      this.tooltipClass = className;
      this.tooltipFormatter = formatter;
//      this._attr = _.defaults(chart.config || {}, {
//        'tooltipClass' : 'k4tip',
//        'tooltipFormatter' : 'It works'
//      });
    }

    Tooltip.prototype.draw = function () {
//      this._attr.tooltipFormatter = chart.chartData.tooltipFormatter;
      return renderTooltip(this);
    };

    Tooltip.prototype.set = function (name, val) {
      this[name] = val;
    };

    Tooltip.prototype.get = function (name) {
      return this[name];
    };

    return Tooltip;
  };
});
