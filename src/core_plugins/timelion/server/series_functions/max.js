import reduce from '../lib/reduce.js';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('max', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'value',
      types: ['seriesList', 'number'],
      help: 'Sets the point to whichever is higher, the existing value, or the one passed.' +
      ' If passing a seriesList it must contain exactly 1 series.'

    }

  ],
  help: 'Maximum values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  fn: function maxFn(args) {
    return reduce(args, function (a, b) {
      return Math.max(a, b);
    });
  }
});
