var reduce = require('../utils/reduce.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'roundCount',
      types: ['number']
    }
  ],
  help: 'number of digits to round the decimal portion of the value to',
  fn: function roundTo (inputSeries, roundCount) {
    return reduce([inputSeries, roundCount], function (a, b) {
      return parseInt(a * Math.pow(10, b), 10) / Math.pow(10, b);
    });
  }
};
