var alter = require('../utils/alter.js');
var asSorted = require('../utils/asSorted.js');

var _ = require('lodash');

module.exports = function movingaverage (args) {
  return alter(args, function (args) {

    var windowSize = args[1];
    args[0].data = asSorted(args[0].data, function (pairs) {
      return _.map(pairs, function(point, i) {
        if (i < windowSize) { return [point[0], null]; }

        var average = _.chain(pairs.slice(i - windowSize, i))
        .map(function (point) {
          return point[1];
        }).reduce(function (memo, num) {
          return (memo + num);
        }).value() / windowSize;

        return [point[0], average];
      });
    });

    return args[0];
  });
};
