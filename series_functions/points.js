var alter = require('../lib/alter.js');
var _ = require('lodash');

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
      name: 'symbol',
      help: 'cross/circle/triangle/square/diamond',
      types: ['string', 'null']
    },
    {
      name: 'show',
      types: ['number', 'null']
    }
  ],
  help: 'Show the series as points',
  fn: function pointsFn(args) {
    return alter(args, function (eachSeries, radius, weight, fill, fillColor, symbol, show) {
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

      var validSymbols = ['triangle', 'cross', 'square', 'diamond', 'circle']
      if (!_.contains(['triangle', 'cross', 'square', 'diamond', 'circle'], symbol)) {
        throw new Error('Valid symbols are: ' + validSymbols.join(', '));
      }

      eachSeries.points.symbol = symbol;

      eachSeries.points.show = show == null ? true : show;



      return eachSeries;
    });
  }
});
