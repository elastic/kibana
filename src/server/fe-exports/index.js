module.exports = function (kibana) {
  var server = kibana.server;
  var FeExportsCollection = require('./FeExportsCollection');

  server.decorate('server', 'getApps', function () {
    return kibana.feExports.apps;
  });

  kibana.feExports = new FeExportsCollection();
};
