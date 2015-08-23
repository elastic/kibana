var alter = require('../lib/alter.js');
var _ = require('lodash');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'window',
      types: ['number']
    }
  ],
  aliases: ['mvavg'],
  help: 'Calculate the moving average over a given window. Nice for smoothing noisey series',
  fn: function movingaverageFn(args) {
    return alter(args, function (inputSeries, _window) {

      var pairs = inputSeries.data;

      inputSeries.data = _.map(pairs, function (point, i) {
        if (i < _window) { return [point[0], null]; }

        var average = _.chain(pairs.slice(i - _window, i))
        .map(function (point) {
          return point[1];
        }).reduce(function (memo, num) {
          return (memo + num);
        }).value() / _window;

        return [point[0], average];
      });
      return inputSeries;
    });
  }
};
