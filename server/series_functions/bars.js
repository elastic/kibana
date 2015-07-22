var alter = require('../utils/alter.js');
module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    }
  ],
  help: 'Show the seriesList as bars',
  fn: function linewidth (inputSeries) {
    return alter([inputSeries], function (args) {
      args[0].bars = args.bars || {};
      args[0].bars.show = args[1] == null ? 1 : args[1];
      return args[0];
    });
  }
};
