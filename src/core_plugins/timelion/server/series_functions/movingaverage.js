import alter from '../lib/alter.js';
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';
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
    },
    {
      name: 'position',
      types: ['string', 'null'],
      help: 'Position of the averaged points relative to the result time.  Options are left, right, and center (default).'
    }
  ],
  aliases: ['mvavg'],
  help: 'Calculate the moving average over a given window. Nice for smoothing noisey series',
  fn: function movingaverageFn(args) {
    return alter(args, function (eachSeries, _window, _position) {

      _position = _position || 'center';
      const validPositions = ['left', 'right', 'center'];
      if (!_.contains(validPositions, _position)) throw new Error('Valid positions are: ' + validPositions.join(', '));

      const pairs = eachSeries.data;
      const pairsLen = pairs.length;
      eachSeries.label = eachSeries.label + ' mvavg=' + _window;

      function toPoint(point, pairSlice) {
        const average = _.chain(pairSlice)
        .map(1).reduce(function (memo, num) {
          return (memo + num);
        }).value() / _window;

        return [point[0], average];
      }

      if (_position === 'center') {
        const windowLeft = Math.floor(_window / 2);
        const windowRight = _window - windowLeft;
        eachSeries.data = _.map(pairs, function (point, i) {
          if (i < windowLeft || i >= pairsLen - windowRight) return [point[0], null];
          return toPoint(point, pairs.slice(i - windowLeft, i + windowRight));
        });
      } else if (_position === 'left') {
        eachSeries.data = _.map(pairs, function (point, i) {
          if (i < _window) return [point[0], null];
          return toPoint(point, pairs.slice(i - _window, i));
        });

      } else if (_position === 'right') {
        eachSeries.data = _.map(pairs, function (point, i) {
          if (i >= pairsLen - _window) return [point[0], null];
          return toPoint(point, pairs.slice(i , i + _window));
        });

      }

      return eachSeries;
    });
  }
});
