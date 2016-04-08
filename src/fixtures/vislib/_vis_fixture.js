import _ from 'lodash';
import $ from 'jquery';
import VislibVisProvider from 'ui/vislib/vis';

let $visCanvas = $('<div>')
  .attr('id', 'vislib-vis-fixtures')
  .css({
    height: '500px',
    width: '1024px',
    display: 'flex',
    position: 'fixed',
    top: '0px',
    left: '0px',
    overflow: 'hidden'
  })
  .appendTo('body');

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
    let Vis = Private(VislibVisProvider);
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
