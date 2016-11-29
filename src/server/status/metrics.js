import _ from 'lodash';
import Samples from './samples';
module.exports = function (kbnServer, server, config) {
  let lastReport = Date.now();

  kbnServer.metrics = new Samples(12);

  server.plugins['even-better'].monitor.on('ops', function (event) {
    let now = Date.now();
    let secSinceLast = (now - lastReport) / 1000;
    lastReport = now;

    let port = config.get('server.port');
    let requests = _.get(event, ['requests', port, 'total'], 0);
    let requestsPerSecond = requests / secSinceLast;

    kbnServer.metrics.add({
      heapTotal: _.get(event, 'psmem.heapTotal'),
      heapUsed: _.get(event, 'psmem.heapUsed'),
      load: event.osload,
      responseTimeAvg: _.get(event, ['responseTimes', port, 'avg']),
      responseTimeMax: _.get(event, ['responseTimes', port, 'max']),
      requestsPerSecond: requestsPerSecond
    });

  });
};
