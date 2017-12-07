import reduce from '../lib/reduce.js';
import Chainable from '../lib/classes/chainable';

export default new Chainable('divide', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'divisor',
      types: ['seriesList', 'number'],
      help: 'Number or series to divide by. SeriesList with multiple series will be applied label-wise.'
    }
  ],
  help: 'Divides the values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  fn: function divideFn(args) {
    return reduce(args, function (a, b) {
      return a / b;
    });
  }
});
