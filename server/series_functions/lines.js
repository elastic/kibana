var alter = require('../utils/alter.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'lineWidth',
      types: ['number', 'null']
    }
  ],
  help: 'Show the seriesList as lines',
  fn: function lines (inputSeries, lineWidth) {
    return alter([inputSeries, lineWidth], function (args) {
      args[0].lines = args[0].lines || {};
      args[0].lines.show = args[1] == null ? 1 : args[1];
      args[0].lines.lineWidth = args[1] == null ? 5 : args[1];
      args[0].lines.shadowSize = 0;
      return args[0];
    });
  }
};
