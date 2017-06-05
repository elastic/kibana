import reduce from '../lib/reduce.js';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('divide', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'divisor',
      types: ['seriesList', 'number'],
      help: 'Number or series to divide by. If passing a seriesList it must contain exactly 1 series.'
    }
  ],
  help: 'Divides the values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  fn: function divideFn(args) {
    return reduce(args, function (a, b) {
      return a / b;
    });
  }
});
