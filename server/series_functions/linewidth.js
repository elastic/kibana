var alter = require('../utils/alter.js');

module.exports = function linewidth (args) {
  return alter(args, function (args) {
    args[0].lines = {lineWidth: args[1]};
    return args[0];
  });
};
