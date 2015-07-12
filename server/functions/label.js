var alter = require('../utils/alter.js');

module.exports = function label (args) {
  return alter(args, function (args) {
    if (args[2] && args[0].label) {
      return args[0];
    }
    args[0].label = args[1];
    return args[0];
  });
};
