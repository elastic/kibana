var alter = require('../utils/alter.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'barWidth',
      types: ['number', 'null']
    }
  ],
  help: 'Show the seriesList as bars',
  fn: function bars (inputSeries, barWidth) {
    return alter([inputSeries, barWidth], function (args) {
      args[0].bars = args[0].bars || {};
      args[0].bars.show = args[1] == null ? 1 : args[1];
      args[0].bars.lineWidth = args[1] == null ? 6 : args[1];
      return args[0];
    });
  }
};
