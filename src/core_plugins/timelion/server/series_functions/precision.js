import reduce from '../lib/reduce.js';
import alter from '../lib/alter.js';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('precision', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'precision',
      types: ['number'],
      help: 'Number of digits to round each value to'
    }
  ],
  help: 'number of digits to round the decimal portion of the value to',
  fn: function precisionFn(args) {
    alter(args, function (eachSeries, precision) {
      eachSeries._meta = eachSeries._meta || {};
      eachSeries._meta.precision = precision;
      return eachSeries;
    });

    return reduce(args, function (a, b) {
      return parseInt(a * Math.pow(10, b), 10) / Math.pow(10, b);
    });
  }
});
