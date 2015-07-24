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
    }
  ],
  help: 'Show the seriesList as lines',
  fn: function lines (inputSeries, width, fill, show) {
    return alter([inputSeries, width, fill, show], function (args) {
      args[0].lines = args[0].lines || {};
      args[0].lines.lineWidth = args[1] == null ? 5 : args[1];
      args[0].lines.fill = args[2]/10;

      args[0].lines.show = args[3];

      return args[0];
    });
  }
};
