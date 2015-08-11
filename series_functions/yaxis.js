var alter = require('../lib/alter.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'yaxis',
      types: ['number', 'null']
    },
    {
      name: 'min',
      types: ['number', 'null']
    },
    {
      name: 'max',
      types: ['number', 'null']
    },
    {
      name: 'position',
      types: ['string', 'null']
    },
  ],
  help: 'This is an internal function that simply returns the input series. Don\'t use this',
  fn: function yaxisFn(args) {
    return alter(args, function (inputSeries, yaxis, min, max, position) {
      yaxis = yaxis || 1;

      inputSeries.yaxis = yaxis;
      inputSeries._global = inputSeries._global || {};

      var yaxes = inputSeries._global.yaxes = inputSeries._global.yaxes || [];
      var myAxis = yaxes[yaxis - 1] = yaxes[yaxis - 1] || {};
      myAxis.position = position;
      myAxis.min = min == null ? 0 : min;
      myAxis.max = max;


      return inputSeries;
    });
  }
};
