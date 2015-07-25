var alter = require('../utils/alter.js');

module.exports = {
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
  fn: function linesFn (args) {
    return alter(args, function (inputSeries, width, fill, show, steps) {
      inputSeries.lines = inputSeries.lines || {};

      // Defaults
      if (inputSeries.lines.lineWidth == null) inputSeries.lines.lineWidth = 5;

      if (width != null) inputSeries.lines.lineWidth = width;
      if (fill != null)  inputSeries.lines.fill = fill/10;
      if (show != null)  inputSeries.lines.show = show;
      if (steps != null) inputSeries.lines.steps = steps;

      return inputSeries;
    });
  }
};
