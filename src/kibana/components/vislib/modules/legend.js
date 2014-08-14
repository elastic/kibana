define(function (require) {
  return function LegendFactory(d3, Private) {
    var _ = require('lodash');

    var renderLegend = Private(require('components/vislib/components/Legend/legend'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    function Legend(legend) {
      this.legendClass = legend.class;
      this.labels = legend.labels;
      this.color = legend.color;
      this.blurredOpacity = 0.3;
      this.focusOpacity = 1;
      this.defaultOpacity = 1;
      this.isOpen = false;
//      this._attr = _.defaults(vis.config || {}, {
//        'legendClass' : 'legend-col-wrapper',
//        'blurredOpacity' : 0.3,
//        'focusOpacity' : 1,
//        'defaultOpacity' : 1,
//        'isOpen' : false
//      });
    }

    Legend.prototype.draw = function () {
      return renderLegend(this);
    };

    Legend.prototype.set = function (name, val) {
      this[name] = val;
    };

    Legend.prototype.get = function (name) {
      return this[name];
    };

    return Legend;
  };
});