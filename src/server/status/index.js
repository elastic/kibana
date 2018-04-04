import ServerStatus from './server_status';
import { Metrics } from './metrics';

export function statusMixin(kbnServer, server, config) {
  kbnServer.status = new ServerStatus(kbnServer.server);

  if (server.plugins['even-better']) {
    const metrics = new Metrics(config, server);

    server.plugins['even-better'].monitor.on('ops', event => {
      metrics.capture(event).then(data => { kbnServer.metrics = data; });
    });
  }
}
