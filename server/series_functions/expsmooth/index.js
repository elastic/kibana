var _ = require('lodash');
var Chainable = require('../../lib/classes/chainable');
var ses = require('./lib/ses');
var des = require('./lib/des');

module.exports = new Chainable('expsmooth', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'alpha',
      types: ['number'],
      help: 'The weight of the the smoothing component (between 0 and 1)'
    },
    {
      name: 'beta',
      types: ['number'],
      help: 'The weight of the trending component (between 0 and 1)'
    },
  ],
  help: 'Sample the beginning of a series and use it to predict what should happen',
  fn: function expsmoothFn(args) {

    let newSeries = _.cloneDeep(args.byName.inputSeries);

    const alpha = args.byName.alpha;
    const beta = args.byName.beta;

    _.each(newSeries.list, function (series) {

      // Single exponential smoothing
      // This is basically a weighted moving average in which the older
      // points exponentially degrade relative to the alpha, eg:
      // 0.8^1, 0.8^2, 0.8^3, etc

      if (alpha && !beta) {
        _.assign(series.data, ses(series.data, alpha));
      }

      if (alpha && beta) {
        _.assign(series.data, des(series.data, alpha, beta));
      }

    });

    return newSeries;
  }
});
