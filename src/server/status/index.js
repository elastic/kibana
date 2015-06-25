module.exports = function (kibana) {
  var _ = require('lodash');
  var Samples = require('./Samples');
  var KbnStatus = require('./KbnStatus');
  var join = require('path').join;

  var server = kibana.server;
  var config = server.config();

  kibana.status = new KbnStatus(kibana.server);
  kibana.metrics = new Samples(60);

  server.exposeStaticDir('/status/{path*}', join(__dirname, 'public'));

  server.plugins.good.monitor.on('ops', function (event) {
    var port = config.get('kibana.server.port');

    kibana.metrics.add({
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

  server.route({
    method: 'GET',
    path: '/status/health',
    handler: function (request, reply) {
      return reply({
        status: kibana.status,
        metrics: kibana.metrics
      });
    }
  });
};
