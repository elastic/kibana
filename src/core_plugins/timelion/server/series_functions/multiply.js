const reduce = require('../lib/reduce.js');

const Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('multiply', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'multiplier',
      types: ['seriesList', 'number'],
      help: 'Number or series by which to multiply. If passing a seriesList it must contain exactly 1 series.'
    }
  ],
  help: 'Multiply the values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  fn: function multiplyFn(args) {
    return reduce(args, function (a, b) {
      return a * b;
    });
  }
});
