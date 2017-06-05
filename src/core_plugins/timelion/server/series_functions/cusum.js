import alter from '../lib/alter.js';
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('cusum', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'base',
      types: ['number'],
      help: 'Number to start at. Basically just adds this to the beginning of the series'
    }
  ],
  help: 'Return the cumulative sum of a series, starting at a base.',
  fn: function cusumFn(args) {
    return alter(args, function (eachSeries, base) {
      const pairs = eachSeries.data;
      let total = base || 0;
      eachSeries.data = _.map(pairs, function (point) {
        total += point[1];
        return [point[0], total];
      });

      return eachSeries;
    });
  }
});
