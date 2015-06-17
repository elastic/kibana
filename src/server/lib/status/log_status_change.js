var util = require('util');
module.exports = function (plugin) {
  return function (current, previous) {
    var logMsg = util.format('[ %s ] Change status from %s to %s - %s', plugin.name, previous.state, current.state, current.message);
    plugin.server.log('plugin', logMsg);
  };
};
