var alter = require('../lib/alter.js');

var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('yaxis', {
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
    return alter(args, function (eachSeries, yaxis, min, max, position) {
      yaxis = yaxis || 1;

      eachSeries.yaxis = yaxis;
      eachSeries._global = eachSeries._global || {};

      var yaxes = eachSeries._global.yaxes = eachSeries._global.yaxes || [];
      var myAxis = yaxes[yaxis - 1] = yaxes[yaxis - 1] || {};
      myAxis.position = position;
      myAxis.min = min == null ? 0 : min;
      myAxis.max = max;


      return eachSeries;
    });
  }
});
