import ServerStatus from './server_status';
import { MetricsCollector } from './metrics_collector';
import { Metrics } from './metrics_collector/metrics';
import { registerStatusPage, registerStatusApi, registerStatsApi } from './routes';

export function statusMixin(kbnServer, server, config) {
  const collector = new MetricsCollector(server, config);
  kbnServer.status = new ServerStatus(kbnServer.server);

  const { ['even-better']: evenBetter } = server.plugins;

  if (evenBetter) {
    const metrics = new Metrics(config, server);

    evenBetter.monitor.on('ops', event => {
      // for status API (to deprecate in next major)
      metrics.capture(event).then(data => { kbnServer.metrics = data; });

      // for metrics API (replacement API)
      collector.collect(event); // collect() is async, but here we aren't depending on the return value
    });
  }

  // init routes
  registerStatusPage(kbnServer, server, config);
  registerStatusApi(kbnServer, server, config);
  registerStatsApi(kbnServer, server, config, collector);
}
