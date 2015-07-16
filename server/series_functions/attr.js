var alter = require('../utils/alter.js');

module.exports = function attr (args) {
  return alter(args, function (args) {
    args[0][args[1]] = args[2];
    return args[0];
  });
};
