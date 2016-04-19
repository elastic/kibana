var d3 = require('d3');
var _ = require('lodash');
var control = require('plugins/heatmap/vis/components/control/events');
var layoutGenerator = require('plugins/heatmap/vis/components/layout/generator');
var chartGenerator = require('plugins/heatmap/vis/components/visualization/generator');

function vis() {
  var events = control();
  var layout = layoutGenerator();
  var chart = chartGenerator();
  var opts = {};
  var listeners = {};
  var size = [250, 250];

  function generator(selection) {
    selection.each(function (data) {
      events.listeners(listeners);

      layout.attr({
        type: opts.layout || 'grid',
        columns: opts.numOfColumns || 0,
        size: size
      });

      chart.options(opts);

      d3.select(this)
        .attr('width', '100%')
        .attr('height', size[1])
        .call(events)
        .call(layout)
        .selectAll('g.chart')
        .call(chart);
    });
  }

  // Public API

  generator.options = function (v) {
    if (!arguments.length) { return opts; }
    opts = _.isPlainObject(v) ? v : opts;
    return generator;
  };

  generator.listeners = function (v) {
    if (!arguments.length) { return listeners; }
    listeners = _.isPlainObject(v) ? v : listeners;
    return generator;
  };

  generator.size = function (v) {
    if (!arguments.length) { return size; }
    size = (_.isArray(v) && _.size(v) === 2) ? v : size;
    return generator;
  };

  return generator;
}

module.exports = vis;
