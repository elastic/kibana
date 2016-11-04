import alter from '../lib/alter.js';
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('range', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'min',
      types: ['number'],
      help: 'New minimum value'
    },
    {
      name: 'max',
      types: ['number'],
      help: 'New maximum value'
    }
  ],
  help: 'Changes the max and min of a series while keeping the same shape',
  fn: function range(args) {
    return alter(args, function (eachSeries) {
      const values = _.map(eachSeries.data, 1);
      const min = _.min(values);
      const max = _.max(values);

      // newvalue= (max'-min')/(max-min)*(value-min)+min'.
      const data = _.map(eachSeries.data, function (point) {
        const val = (args.byName.max - args.byName.min) /
          (max - min) * (point[1] - min) + args.byName.min;
        return [point[0], val];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  }
});
