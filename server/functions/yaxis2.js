var alter = require('../utils/alter.js');

module.exports = function yaxis2 (args) {
  return alter(args, function (args) {
    args[0].yaxis = 2;
    return args[0];
  });
};
