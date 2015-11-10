var alter = require('../lib/alter.js');
var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('color', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'color',
      types: ['string'],
      help: 'Color of series, as hex, eg #c6c6c6 is a lovely light grey.'
    }
  ],
  help: 'Change the color of the series',
  fn: function colorFn(args) {
    return alter(args, function (eachSeries, color) {
      eachSeries.color = color;
      return eachSeries;
    });
  }
});
