var alter = require('../lib/alter.js');
var toMS = require('../lib/to_milliseconds.js');

var _ = require('lodash');
var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('scaleinterval', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'interval',
      types: ['string']
    }
  ],
  help: 'Return the absolute value of each value in the series list',
  fn: function scaleintervalFn(args, tlConfig) {
    var millis = toMS(tlConfig.time.interval);
    var scaleInterval = toMS(args.byName.interval);

    return alter(args, function (eachSeries) {
      var data = _.map(eachSeries.data, function (point) {
        return [point[0], (point[1] / millis) * scaleInterval];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  }
});
