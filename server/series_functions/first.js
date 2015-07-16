var alter = require('../utils/alter.js');

module.exports = function first (args) {
  return alter(args, function (args) {
    return args[0];
  });
};
