var alter = require('../utils/alter.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'yaxis',
      types: ['number']
    }
  ],
  help: 'This is an internal function that simply returns the input series. Don\'t use this',
  fn: function yaxisFn (args) {
    return alter(args, function (inputSeries, yaxis) {
      inputSeries.yaxis = yaxis;
      return inputSeries;
    });
  }
};
