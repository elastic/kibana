var _ = require('lodash');
var Chainable = require('../../lib/classes/chainable');
var ses = require('./lib/ses');
var des = require('./lib/des');
var tes = require('./lib/tes');
var toMilliseconds = require('../../lib/to_milliseconds');

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
      types: ['string'],
      help: 'How long is the season, eg, 1w if you pattern repeats weekly. (Only useful with gamma)'
    },
    {
      name: 'sample',
      types: ['number'],
      help: 'The number of seasons to sample before starting to smooth in a series with seasonality. (Only useful with gamma)'
    }
  ],
  help: 'Sample the beginning of a series and use it to forecast what should happen via several optional parameters',
  fn: function expsmoothFn(args, tlConfig) {

    let newSeries = _.cloneDeep(args.byName.inputSeries);

    const alpha = args.byName.alpha;
    const beta = args.byName.beta;
    const gamma = args.byName.gamma;
    const sample = args.byName.sample;

    _.each(newSeries.list, function (series) {

      // Single exponential smoothing
      // This is basically a weighted moving average in which the older
      // points exponentially degrade relative to the alpha, eg:
      // 0.8^1, 0.8^2, 0.8^3, etc

      var times = _.map(series.data, 0);
      var points = _.map(series.data, 1);

      if (alpha != null && beta == null && gamma == null) {
        points = ses(points, alpha);
      }

      if (alpha != null && beta != null && gamma == null) {
        points = des(points, alpha, beta);
      }

      if (alpha != null && beta != null && gamma != null) {
        if (!sample || !args.byName.season || sample < 2) {
          throw new Error('Must specificy a season length and a sample size >= 2');
        }
        const season = Math.round(toMilliseconds(args.byName.season) / toMilliseconds(tlConfig.time.interval));
        points = tes(points, alpha, beta, gamma, season, sample);
      }

      _.assign(series.data, _.zip(times, points));
    });

    return newSeries;
  }
});
