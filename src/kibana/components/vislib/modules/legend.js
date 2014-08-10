define(function (require) {
  return function LegendFactory(d3, Private) {
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/modules/_chart'));
    var renderLegend = Private(require('components/vislib/components/Legend/legend'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    _(Legend).inherits(Chart);
    function Legend(vis) {
      Legend.Super.apply(this, arguments);
      this._attr = _.defaults(vis.config || {}, {
        'legendClass' : 'legendwrapper',
        'blurredOpacity' : 0.3,
        'focusOpacity' : 1,
        'defaultOpacity' : 1,
        'isOpen' : false
      });
    }

    Legend.prototype.draw = function () {
      return renderLegend(this);
    };

    return Legend;
  };
});