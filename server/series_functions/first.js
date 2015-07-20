var alter = require('../utils/alter.js');
var _ = require('lodash');

module.exports = function first (args) {
  return alter(args, function (args) {
    if (_.isObject(args[0]) && args[0].type === 'seriesList') {
      return args[0].list;
    }
    return args[0];
  });
};
