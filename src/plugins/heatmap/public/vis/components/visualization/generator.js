import d3 from 'd3';
import _ from 'lodash';
import builder from 'plugins/heatmap/vis/components/utils/builder';
import heatmap from 'plugins/heatmap/vis/components/visualization/heatmap';

function chartGenerator() {
  var opts = {};

  function generator(selection) {
    selection.each(function (data) {
      var dataOpts = (data && data.options) || {};
      var accessor = opts.accessor || dataOpts.accessor || 'cells';
      var chart = heatmap()
        .width(data.width)
        .height(data.height)
        .accessor(accessor);

      _.forEach([opts, dataOpts], function (o) {
        builder(o, chart);
      });

      d3.select(this).call(chart); // Draw Chart
    });
  }

  // Public API
  generator.options = function (v) {
    if (!arguments.length) { return opts; }
    opts = _.isPlainObject(v) && !_.isArray(v) ? v : opts;
    return generator;
  };

  return generator;
}

export default chartGenerator;
