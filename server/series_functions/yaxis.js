var alter = require('../utils/alter.js');

module.exports = function yaxis (args) {
  return alter(args, function (args) {
    args[0].yaxis = args[1];
    return args[0];
  });
};
