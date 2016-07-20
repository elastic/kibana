module.exports = function (kbnServer, server, config) {
  let _ = require('lodash');
  let ServerStatus = require('./ServerStatus');
  var { join } = require('path');

  kbnServer.status = new ServerStatus(kbnServer.server);

  if (server.plugins.good) {
    kbnServer.mixin(require('./metrics'));
  }

  server.route({
    method: 'GET',
    path: '/api/status',
    handler: function (request, reply) {
      return reply({
        status: kbnServer.status.toJSON(),
        metrics: kbnServer.metrics
      });
    }
  });

  server.decorate('reply', 'renderStatusPage', function () {
    let app = kbnServer.uiExports.getHiddenApp('statusPage');
    let resp = app ? this.renderApp(app) : this(kbnServer.status.toString());
    resp.code(kbnServer.status.isGreen() ? 200 : 503);
    return resp;
  });

  server.route({
    method: 'GET',
    path: '/status',
    handler: function (request, reply) {
      return reply.renderStatusPage();
    }
  });
};
