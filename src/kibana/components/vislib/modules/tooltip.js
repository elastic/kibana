define(function (require) {
  return function TooltipFactory(d3, Private) {
    var _ = require('lodash');

    var renderTooltip = Private(require('components/vislib/components/Tooltip/tooltip'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    function Tooltip(chart) {
      this._attr = _.defaults(chart.config || {}, {
        'tooltipClass' : 'k4tip',
        'tooltipFormatter' : 'It works'
      });
    }

    Tooltip.prototype.draw = function (chart) {
      this._attr.tooltipFormatter = chart.chartData.tooltipFormatter;
      return renderTooltip(chart);
    };

    return Tooltip;
  };
});
