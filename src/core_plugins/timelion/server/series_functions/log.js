import alter from '../lib/alter.js';
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('log', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'base',
      types: ['number'],
      help: 'Set logarithmic base, 10 by default'

    }
  ],
  help: 'Return the logarithm value of each value in the series list (default base: 10)',
  fn: function logFn(args) {
    const config = args.byName;
    return alter(args, function (eachSeries) {
      const data = _.map(eachSeries.data, function (point) {
        return [point[0], Math.log(point[1]) / Math.log(config.base || 10)];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  }
});
