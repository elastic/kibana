var alter = require('../lib/alter.js');

module.exports = {
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
  fn: function colorFn (args) {
    return alter(args, function (inputSeries, color) {
      inputSeries.color = color;
      return inputSeries;
    });
  }
};
