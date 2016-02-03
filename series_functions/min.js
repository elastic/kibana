var reduce = require('../lib/reduce.js');

var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('min', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'value',
      types: ['seriesList', 'number'],
      help: 'Number, series to min with the input series. If passing a seriesList it must contain exactly 1 series.'

    }

  ],
  help: 'Minimum values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  fn: function minFn(args) {
    return reduce(args, function (a, b) {
      return Math.min(a, b);
    });
  }
});
