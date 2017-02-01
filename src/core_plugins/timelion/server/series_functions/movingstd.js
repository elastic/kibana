let alter = require('../lib/alter.js');
let _ = require('lodash');
let Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('movingstd', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'window',
      types: ['number'],
      help: 'Number of points to compute the standard deviation over'
    }
  ],
  aliases: ['mvstd'],
  help: 'Calculate the moving standard deviation over a given window. Uses naive two-pass algorithm. Rounding errors ' +
    'may become more noticeable with very long series, or series with very large numbers.',
  fn: function movingstdFn(args) {
    return alter(args, function (eachSeries, _window) {

      let pairs = eachSeries.data;

      eachSeries.data = _.map(pairs, function (point, i) {
        if (i < _window) { return [point[0], null]; }

        let average = _.chain(pairs.slice(i - _window, i))
        .map(function (point) {
          return point[1];
        }).reduce(function (memo, num) {
          return (memo + num);
        }).value() / _window;

        let variance = _.chain(pairs.slice(i - _window, i))
        .map(function (point) {
          return point[1];
        }).reduce(function (memo, num) {
          return memo + Math.pow(num - average, 2);
        }).value() / (_window - 1);

        return [point[0], Math.sqrt(variance)];
      });
      return eachSeries;
    });
  }
});
