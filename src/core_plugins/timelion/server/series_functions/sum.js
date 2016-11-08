import reduce from '../lib/reduce.js';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('sum', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'term',
      types: ['seriesList', 'number'],
      help: 'Number or series to sum with the input series. If passing a seriesList it must contain exactly 1 series.'

    }
  ],
  help: 'Adds the values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  aliases: ['add', 'plus'],
  fn: function sumFn(args) {
    return reduce(args, function (a, b) {
      return a + b;
    });
  }
});