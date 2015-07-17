var alter = require('../utils/alter.js');

module.exports = function linewidth (args) {
  return alter(args, function (args) {
    args[0].bars = args.bars || {};
    args[0].bars.show = args[1] == null ? 1 : args[1];
    return args[0];
  });
};
