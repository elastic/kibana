var alter = require('../lib/alter.js');

var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('points', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'radius',
      types: ['number', 'null']
    },
    {
      name: 'weight',
      types: ['number', 'null']
    },
    {
      name: 'fill',
      types: ['number', 'null']
    },
    {
      name: 'fillColor',
      types: ['string', 'null']
    },
    {
      name: 'show',
      types: ['number', 'null']
    }
  ],
  help: 'Show the series as points',
  fn: function pointsFn(args) {
    return alter(args, function (inputSeries, radius, weight, fill, fillColor, show) {
      inputSeries.points = inputSeries.points || {};
      inputSeries.points.radius = radius == null ? undefined : radius;

      if (fill) {
        inputSeries.points.fillColor = fillColor == null ? false : fillColor;
      }

      if (fill != null) {
        inputSeries.points.fill =  fill / 10;
      }

      if (weight != null) {
        inputSeries.points.lineWidth = weight;
      }

      inputSeries.points.show = show == null ? true : show;



      return inputSeries;
    });
  }
});
