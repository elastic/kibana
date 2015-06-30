var Status = require('./Status');

function ServerStatus(server) {
  this.server = server;
  this.each = {};
}

ServerStatus.prototype.create = function (name) {
  return (this.each[name] = new Status(name, this.server));
};

ServerStatus.prototype.decoratePlugin = function (plugin) {
  plugin.status = this.create(plugin.id);
};

ServerStatus.prototype.toJSON = function () {
  return this.each;
};

module.exports = ServerStatus;
