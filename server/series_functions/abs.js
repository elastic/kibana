var alter = require('../utils/alter.js');
var _ = require('lodash');

module.exports = function abs (args) {
  return alter(args, function (args) {
    var data = _.map(args[0].data, function (point) {
      return [point[0], Math.abs(point[1])];
    });
    args[0].data = data;
    return args[0];
  });
};
