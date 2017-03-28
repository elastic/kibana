import alter from '../lib/alter.js';
import toMS from '../lib/to_milliseconds.js';
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('scale_interval', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'interval',
      types: ['string'],
      help: 'The new interval in date math notation, eg 1s for 1 second. 1m, 5m, 1M, 1w, 1y, etc.'
    }
  ],
  help: 'Changes scales a value (usually a sum or a count) to a new interval. For example, as a per-second rate',
  fn: function scaleIntervalFn(args, tlConfig) {
    const currentInterval = toMS(tlConfig.time.interval);
    const scaleInterval = toMS(args.byName.interval);

    return alter(args, function (eachSeries) {
      const data = _.map(eachSeries.data, function (point) {
        return [point[0], (point[1] / currentInterval) * scaleInterval];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  }
});
