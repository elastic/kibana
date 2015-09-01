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
    return alter(args, function (eachSeries, radius, weight, fill, fillColor, show) {
      eachSeries.points = eachSeries.points || {};
      eachSeries.points.radius = radius == null ? undefined : radius;

      if (fill) {
        eachSeries.points.fillColor = fillColor == null ? false : fillColor;
      }

      if (fill != null) {
        eachSeries.points.fill =  fill / 10;
      }

      if (weight != null) {
        eachSeries.points.lineWidth = weight;
      }

      eachSeries.points.show = show == null ? true : show;



      return eachSeries;
    });
  }
});
