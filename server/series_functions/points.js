var alter = require('../utils/alter.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'pointSize',
      types: ['number', 'null']
    }
  ],
  help: 'Show the series as points',
  fn: function linewidth (inputSeries, pointSize) {
    return alter([inputSeries, pointSize], function (args) {
      console.log(args[1]);
      args[0].points = args.points || {};
      args[0].points.show = args[1] == null ? 1 : args[1];
      args[0].points.radius = args[1] == null ? undefined : args[1];
      return args[0];
    });
  }
};
