define(function (require) {
  return function TooltipFactory(d3, Private) {
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/modules/_chart'));
    var renderTooltip = Private(require('components/vislib/utils/d3/tooltip/tooltip'));

    // Dynamically adds css file
    require('css!components/vislib/styles/main');

    _(Tooltip).inherits(Chart);
    function Tooltip(vis) {
      Tooltip.Super.apply(this, arguments);
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
