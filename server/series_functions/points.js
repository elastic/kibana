var alter = require('../utils/alter.js');

module.exports = function linewidth (args) {
  return alter(args, function (args) {
    args[0].points = args.points || {};
    args[0].points.show = args[1] == null ? 1 : args[1];
    args[0].points.radius = args[1] == null ? undefined : args[1];
    return args[0];
  });
};
