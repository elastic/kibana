'use strict';

var alter = require('../lib/alter.js');
var _ = require('lodash');
var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('movingstd', {
  args: [{
    name: 'inputSeries',
    types: ['seriesList']
  }, {
    name: 'window',
    types: ['number'],
    help: 'Number of points to compute the unbiased standard deviation over.'
  }, {
    name: 'position',
    types: ['string', 'null'],
    help: 'Position of the window slice relative to the result time. Options are left, right, and center (default).'
  }],
  aliases: ['mvstd'],
  help: 'Calculate the unbiased moving standard deviation over a given window.',
  fn: function movingstdFn(args) {
    return alter(args, function (eachSeries, _window, _position) {

      _position = _position || 'center';
      var validPositions = ['left', 'right', 'center'];
      if (!_.contains(validPositions, _position)) throw new Error('Valid positions are: ' + validPositions.join(', '));

      var pairs = eachSeries.data;
      var pairsLen = pairs.length;
      eachSeries.label = eachSeries.label + ' mvstd=' + _window;

      function toPoint(point, pairSlice) {
        var average = _.chain(pairSlice).map(1).reduce(function (memo, num) {
          return memo + num;
        }).value() / _window;

        var variance = _.chain(pairSlice).map(function (point) {
          return Math.pow(point[1] - average,2);
        }).reduce(function (memo, num) {
          return memo + num;
        }).value() / (_window - 1);
		
        return [point[0], Math.sqrt(variance)];	
      }

      if (_position === 'center') {
        var windowLeft = Math.floor(_window / 2);
        var windowRight = _window - windowLeft;
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
          return toPoint(point, pairs.slice(i, i + _window));
        });
      }

      return eachSeries;
    });
  }
});
