import alter from '../lib/alter.js';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('lines', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'width',
      types: ['number', 'null'],
      help: 'Line thickness'
    },
    {
      name: 'fill',
      types: ['number', 'null'],
      help: 'Number between 0 and 10. Use for making area charts'
    },
    {
      name: 'stack',
      types: ['boolean', 'null'],
      help: 'Stack lines, often misleading. At least use some fill if you use this.'
    },
    {
      name: 'show',
      types: ['number', 'boolean', 'null'],
      help: 'Show or hide lines'
    },
    {
      name: 'steps',
      types: ['number', 'boolean', 'null'],
      help: 'Show line as step, eg, do not interpolate between points'
    }
  ],
  help: 'Show the seriesList as lines',
  fn: function linesFn(args) {
    return alter(args, function (eachSeries, width, fill, stack, show, steps) {
      eachSeries.lines = eachSeries.lines || {};

      // Defaults
      if (eachSeries.lines.lineWidth == null) eachSeries.lines.lineWidth = 3;

      if (width != null) eachSeries.lines.lineWidth = width;
      if (fill != null)  eachSeries.lines.fill = fill / 10;
      if (stack != null) eachSeries.stack = stack;
      if (show != null)  eachSeries.lines.show = show;
      if (steps != null) eachSeries.lines.steps = steps;

      return eachSeries;
    });
  }
});
