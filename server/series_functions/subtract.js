var reduce = require('../utils/reduce.js');


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
  help: 'Subtract the values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  fn: function subtractFn (args) {
    return reduce(args, function (a, b) {
      return a - b;
    });
  }
};
