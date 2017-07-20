import alter from '../../lib/alter.js';
import Chainable from '../../lib/classes/chainable';
import _ from 'lodash';

const functions = {
  avg: require('./avg'),
  cardinality: require('./cardinality'),
  min: require('./min'),
  max: require('./max'),
  last: require('./last'),
  first: require('./first'),
  sum: require('./sum')
};

module.exports = new Chainable('aggregate', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'function',
      types: ['string'],
      help: 'One of ' + _.keys(functions).join(', ')
    }
  ],
  help: 'Creates a static line based on result of processing all points in the series.' +
  ' Available functions: ' + _.keys(functions).join(', '),
  fn: function aggregateFn(args) {
    const fn = functions[args.byName.function];
    if (!fn) throw new Error('.aggregate() function must be one of: ' + _.keys(functions).join(', '));

    return alter(args, function (eachSeries) {
      const times = _.map(eachSeries.data, 0);
      const values = _.map(eachSeries.data, 1);

      eachSeries.data = _.zip(times, _.fill(values, fn(values)));
      return eachSeries;
    });
  }
});
