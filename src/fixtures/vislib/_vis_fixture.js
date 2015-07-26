module.exports = function VislibFixtures(Private) {
  var $ = require('jquery');
  var _ = require('lodash');

  return function (visLibParams) {
    var Vis = Private(require('ui/vislib/vis'));

    var $el = $('<div class="visualize-chart"></div>')
    .css({ width: 1024, height: 300 })
    .appendTo('body');

    var config = _.defaults(visLibParams || {}, {
      shareYAxis: true,
      addTooltip: true,
      addLegend: true,
      defaultYExtents: false,
      setYExtents: false,
      yAxis: {},
      type: 'histogram'
    });

    return new Vis($el, config);
  };
};
