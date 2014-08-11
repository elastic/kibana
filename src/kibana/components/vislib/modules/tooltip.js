define(function (require) {
  return function TooltipFactory(d3, Private) {
    var _ = require('lodash');

    var renderTooltip = Private(require('components/vislib/components/Tooltip/tooltip'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    function Tooltip(vis) {
      this._attr = _.defaults(vis.config || {}, {
        'tooltipClass' : 'k4tip',
        'tooltipFormatter' : 'It works'
      });
    }

    Tooltip.prototype.draw = function () {
      return renderTooltip(this);
    };

    return Tooltip;
  };
});
