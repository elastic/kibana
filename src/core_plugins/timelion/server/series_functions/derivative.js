import alter from '../lib/alter.js';
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('derivative', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    }
  ],
  help: 'Plot the change in values over time.',
  fn: function derivativeFn(args) {
    return alter(args, function (eachSeries) {
      const pairs = eachSeries.data;
      eachSeries.data = _.map(pairs, function (point, i) {
        if (i === 0 || pairs[i - 1][1] == null || point[1] == null) { return [point[0], null]; }
        return [point[0], point[1] - pairs[i - 1][1]];
      });

      return eachSeries;
    });
  }
});
