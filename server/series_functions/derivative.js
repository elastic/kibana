var alter = require('../utils/alter.js');
var asSorted = require('../utils/asSorted.js');
var _ = require('lodash');

module.exports = function derivative (args) {
  return alter(args, function (args) {
    var pairs = args[0].data;
    args[0].data = _.map(pairs, function(point, i) {
      if (i === 0 || pairs[i - 1][1] == null || point[1] == null) { return [point[0], null]; }
      return [point[0], point[1] - pairs[i - 1][1]];
    });

    return args[0];
  });
};
