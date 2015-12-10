var alter = require('../lib/alter.js');
var _ = require('lodash');
var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('movingaverage', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'window',
      types: ['number'],
      help: 'Number of points to average over'
    }
  ],
  aliases: ['mvavg'],
  help: 'Calculate the moving average over a given window. Nice for smoothing noisey series',
  fn: function movingaverageFn(args) {
    return alter(args, function (eachSeries, _window) {

      var windowLeft = Math.floor( _window / 2);
      var windowRight = _window - windowLeft;

      var pairs = eachSeries.data;
      
      var pairsLen = pairs.length;
      
      eachSeries.label = eachSeries.label + ' mvavg=' + _window;
      eachSeries.data = _.map(pairs, function (point, i) {
        if (i < windowLeft || i >= pairsLen - windowRight ) { return [point[0], null]; }

        var average = _.chain(pairs.slice(i - windowLeft, i + windowRight ))
        .map(function (point) {
          return point[1];
        }).reduce(function (memo, num) {
          return (memo + num);
        }).value() / _window;

        return [point[0], average];
      });
      return eachSeries;
    });
  }
});
