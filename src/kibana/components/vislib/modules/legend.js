define(function (require) {
  return function LegendFactory(d3, Private) {
    var _ = require('lodash');

    var renderLegend = Private(require('components/vislib/components/Legend/legend'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    function Legend(vis) {
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