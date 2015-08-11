var reduce = require('../lib/reduce.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'term',
      types: ['seriesList', 'number']
    }
  ],
  help: 'Adds the values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  aliases: ['add', 'plus'],
  fn: function sumFn(args) {
    return reduce(args, function (a, b) {
      return a + b;
    });
  }
};