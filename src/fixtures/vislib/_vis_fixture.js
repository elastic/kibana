let $ = require('jquery');
let _ = require('lodash');

let $visCanvas = $('<div>').attr('id', 'vislib-vis-fixtures').appendTo('body');
let count = 0;
let visHeight = $visCanvas.height();

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
    let Vis = Private(require('ui/vislib/vis'));
    return new Vis($visCanvas.new(), _.defaults({}, visLibParams || {}, {
      shareYAxis: true,
      addTooltip: true,
      addLegend: true,
      defaultYExtents: false,
      setYExtents: false,
      yAxis: {},
      type: 'histogram',
      hasTimeField: true
    }));
  };
};
