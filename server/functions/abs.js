var alter = require('../utils/alter.js');
var _ = require('lodash');

module.exports = function abs (args) {
  return alter(args, function (args) {
    var data = _.mapValues(args[0].data, function (value) {
      return Math.abs(value);
    });
    args[0].data = data;
    return args[0];
  });
};
