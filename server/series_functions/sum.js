var reduce = require('../utils/reduce.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'addMe',
      types: ['seriesList', 'number']
    }
  ],
  help: 'Adds the values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  aliases: ['add', 'plus'],
  fn: function sum (inputSeries, addMe) {
    return reduce([inputSeries, addMe], function (a, b) {
      return a + b;
    });
  }
};