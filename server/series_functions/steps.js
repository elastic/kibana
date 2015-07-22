var alter = require('../utils/alter.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'stepped',
      types: ['number']
    }
  ],
  help: 'Show the seriesList as stepped lines, Pass 0 to turn off stepping.',
  fn: function lines (inputSeries, stepped) {
    return alter([inputSeries, stepped], function (args) {
      args[0].lines = args.lines || {};
      args[0].lines.steps = args[1] == null ? 1 : args[1];
      args[0].lines.lineWidth = args[1] == null ? 5 : args[1];
      return args[0];
    });
  }
};
