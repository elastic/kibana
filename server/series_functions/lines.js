var alter = require('../utils/alter.js');

module.exports = function lines (args) {
  return alter(args, function (args) {
    args[0].lines = args.lines || {};
    args[0].lines.show = args[1] == null ? 1 : args[1];
    args[0].lines.lineWidth = args[1] == null ? 5 : args[1];
    args[0].lines.shadowSize = 0;
    return args[0];
  });
};
