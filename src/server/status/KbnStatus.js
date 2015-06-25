var PluginStatus = require('./PluginStatus');

function KbnStatus(server) {
  this.server = server;
  this.perPlugin = {};
}

KbnStatus.prototype.decoratePlugin = function (plugin) {
  var name = plugin.name;
  var server = this.server;
  var status = plugin.status = this.perPlugin[name] = new PluginStatus(name);

  status.on('change', function (current, previous) {
    server.log(['plugin', 'status'], {
      message: '[ <%= name %> ] Change status from <%= prev %> to <%= cur %> - <%= curMsg %>',
      name: name,
      prev: previous.state,
      cur: current.state,
      curMsg: current.message
    });
  });
};

KbnStatus.prototype.toJSON = function () {
  return this.perPlugin;
};

module.exports = KbnStatus;
