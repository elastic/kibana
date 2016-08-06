var _ = require('lodash');
var Chainable = require('../../lib/classes/chainable');
var ses = require('./lib/ses');
var des = require('./lib/des');
var tes = require('./lib/tes');


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
    {
      name: 'gamma',
      types: ['number'],
      help: 'The weight of the seasonal component (between 0 and 1)'
    },
    {
      name: 'season',
      types: ['number'],
      help: 'The number of points in a season (eg, 24 if a season is a day and your interval is 1h) (Only useful with gamma)'
    },
    {
      name: 'sample',
      types: ['number'],
      help: 'The number of seasons to sample before starting to smooth in a series with seasonality. (Only useful with gamma)'
    }
  ],
  help: 'Sample the beginning of a series and use it to forecast what should happen via several optional parameters',
  fn: function expsmoothFn(args) {

    let newSeries = _.cloneDeep(args.byName.inputSeries);

    const alpha = args.byName.alpha;
    const beta = args.byName.beta;
    const gamma = args.byName.gamma;
    const season = args.byName.season;
    const sample = args.byName.sample;

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

      if (alpha && beta && gamma) {
        if (!sample || !season || sample < 2) {
          throw new Error('Must specificy a season length and a sample size >= 2');
        }

        _.assign(series.data, tes(series.data, alpha, beta, gamma, season, sample));
      }

    });

    return newSeries;
  }
});
