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
      types: ['string']
    }
  ],
  help: 'Change the color of the series',
  fn: function colorFn(args) {
    return alter(args, function (inputSeries, color) {
      inputSeries.color = color;
      return inputSeries;
    });
  }
});
