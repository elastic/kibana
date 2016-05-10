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
      types: ['number', 'null'],
      help: 'The numbered y-axis to plot this series on, eg .yaxis(2) for a 2nd y-axis.'
    },
    {
      name: 'min',
      types: ['number', 'null'],
      help: 'Min value'
    },
    {
      name: 'max',
      types: ['number', 'null'],
      help: 'Max value'
    },
    {
      name: 'position',
      types: ['string', 'null'],
      help: 'left or right'
    },
  ],
  help: 'Configures a variety of y-axis options, the most important likely being the ability to add an Nth (eg 2nd) y-axis',
  fn: function yaxisFn(args) {
    return alter(args, function (eachSeries, yaxis, min, max, position) {
      yaxis = yaxis || 1;

      eachSeries.yaxis = yaxis;
      eachSeries._global = eachSeries._global || {};

      var yaxes = eachSeries._global.yaxes = eachSeries._global.yaxes || [];
      var myAxis = yaxes[yaxis - 1] = yaxes[yaxis - 1] || {};
      myAxis.position = position || (yaxis % 2 ? 'left' : 'right');
      myAxis.min = min == null ? 0 : min;
      myAxis.max = max;


      return eachSeries;
    });
  }
});
