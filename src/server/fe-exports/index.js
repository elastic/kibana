module.exports = function (kibana) {
  var server = kibana.server;
  var FeExports = require('./FeExports');

  server.decorate('server', 'getApps', function () {
    return kibana.feExports.apps;
  });

  kibana.feExports = new FeExports();
};
