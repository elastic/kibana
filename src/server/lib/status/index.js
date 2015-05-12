var logStatusChange = require('./log_status_change');
var Status = require('./status');

function SystemStatus() {
  this.data = {};
}

SystemStatus.prototype.createStatus = function (plugin) {
  plugin.status = new Status(plugin.name);
  plugin.server.expose('status', plugin.status);
  plugin.status.on('change', logStatusChange(plugin));
  this.data[plugin.name] = plugin.status;
  plugin.status.yellow('Initializing');
};

SystemStatus.prototype.toJSON = function () {
  return this.data;
};

module.exports = new SystemStatus();
