var $ = require('jquery');
var _ = require('lodash');

var $visCanvas = $('<div>').attr('id', 'vislib-vis-fixtures').appendTo('body');
var count = 0;
var visHeight = $visCanvas.height();

$visCanvas.new = function () {
  count += 1;
  if (count > 1) $visCanvas.height(visHeight * count);
  return $('<div>').addClass('visualize-chart').appendTo($visCanvas);
};

afterEach(function () {
  $visCanvas.empty();
  if (count > 1) $visCanvas.height(visHeight);
  count = 0;
});

module.exports = function VislibFixtures(Private) {
  return function (visLibParams) {
    var Vis = Private(require('ui/vislib/vis'));
    return new Vis($visCanvas.new(), _.defaults({}, visLibParams || {}, {
      shareYAxis: true,
      addTooltip: true,
      addLegend: true,
      defaultYExtents: false,
      setYExtents: false,
      yAxis: {},
      type: 'histogram'
    }));
  };
};
