var alter = require('../utils/alter.js');

module.exports = function color (args) {
  return alter(args, function (args) {
    args[0].color = args[1];
    return args[0];
  });
};
