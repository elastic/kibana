var platform = require('os').platform();

module.exports = function winCmd(cmd) {
  return /^win/.test(platform) ? cmd + '.cmd' : cmd;
};
