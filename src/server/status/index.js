module.exports = function (kbnServer) {
  var _ = require('lodash');
  var Samples = require('./Samples');
  var ServerStatus = require('./ServerStatus');
  var join = require('path').join;

  var server = kbnServer.server;
  var config = server.config();

  kbnServer.status = new ServerStatus(kbnServer.server);
  kbnServer.metrics = new Samples(60);

  if (server.plugins.good) {
    server.plugins.good.monitor.on('ops', function (event) {
      var port = config.get('server.port');
      kbnServer.metrics.add({
        rss: event.psmem.rss,
        heapTotal: event.psmem.heapTotal,
        heapUsed: event.psmem.heapUsed,
        load: event.osload,
        delay: event.psdelay,
        concurrency: _.get(event, ['concurrents', port]),
        responseTimeAvg: _.get(event, ['responseTimes', port, 'avg']),
        responseTimeMax: _.get(event, ['responseTimes', port, 'max']),
        requests: _.get(event, ['requests', port, 'total'], 0)
      });
    });
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
    var app = _.get(kbnServer, 'uiExports.apps.hidden.byId.statusPage');
    var resp = app ? this.renderApp(app) : this(kbnServer.status.toString());
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
