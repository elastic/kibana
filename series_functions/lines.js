var alter = require('../lib/alter.js');

var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('lines', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'width',
      types: ['number', 'null']
    },
    {
      name: 'fill',
      types: ['number', 'null']
    },
    {
      name: 'show',
      types: ['number', 'null']
    },
    {
      name: 'steps',
      types: ['number', 'null']
    }
  ],
  help: 'Show the seriesList as lines',
  fn: function linesFn(args) {
    return alter(args, function (eachSeries, width, fill, show, steps) {
      eachSeries.lines = eachSeries.lines || {};

      // Defaults
      if (eachSeries.lines.lineWidth == null) eachSeries.lines.lineWidth = 3;

      if (width != null) eachSeries.lines.lineWidth = width;
      if (fill != null)  eachSeries.lines.fill = fill / 10;
      if (show != null)  eachSeries.lines.show = show;
      if (steps != null) eachSeries.lines.steps = steps;

      return eachSeries;
    });
  }
});
