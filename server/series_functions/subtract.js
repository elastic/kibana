var reduce = require('../utils/reduce.js');


module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'subtractMe',
      types: ['seriesList', 'number']
    }
  ],
  help: 'Subtract the values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  fn: function subtract (inputSeries, subtractMe) {
    return reduce([inputSeries, subtractMe], function (a, b) {
      return a - b;
    });
  }
};
