define(function (require) {
  return function TooltipFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var renderTooltip = Private(require('components/vislib/components/Tooltip/tooltip'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    function Tooltip(className, formatter) {
      this.tooltipClass = className;
      this.tooltipFormatter = formatter;
      this.chartWidth = $('.chart').width();
      this.chartHeight = $('.chart').height();
    }

    Tooltip.prototype.draw = function () {
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
