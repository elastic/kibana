var alter = require('../lib/alter.js');
var offsetTime = require('../lib/offset_time.js');
var _ = require('lodash');
var util = require('util');
var forecast = require('nostradamus');

var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('testcast', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'count',
      types: ['number']
    },
    {
      name: 'alpha',
      types: ['number']
    },
    {
      name: 'beta',
      types: ['number']
    },
    {
      name: 'gamma',
      types: ['number']
    },
  ],
  help: 'Use holt-winters to forecast values. Basically useless. I have no idea how this works.',
  fn:  function testcast(args, tlConfig) {
    var targetSeries = tlConfig.getTargetSeries();

    return alter(args, function (eachSeries, label) {
      var count = args.byName.count;
      var alpha = args.byName.alpha == null ? 0.5 : args.byName.alpha;
      var beta = args.byName.beta == null ? 0.5 : args.byName.beta;
      var gamma = args.byName.gamma == null ? 0.5 : args.byName.gamma;

      var values = _.map(eachSeries.data, function (p) { return p[1]; });
      var predictions = forecast(values, alpha, beta, gamma, count, count / 2);

      _.times(count, function (i) {
        var nextTime = offsetTime(_.last(eachSeries.data)[0], '+' + tlConfig.time.interval);
        eachSeries.data.push([nextTime, predictions[values.length + i]]);
      });

      tlConfig.writeTargetSeries(eachSeries.data);

      return eachSeries;
    });
  }
});
