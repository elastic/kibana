import _ from 'lodash';
import { keysToSnakeCaseShallow } from '../../utils/case_conversion';

export function collectMetrics(kbnServer, server, config) {
  server.plugins['even-better'].monitor.on('ops', function (event) {
    kbnServer.metrics = getMetrics({ event, config });
  });
}

export function getMetrics({ event, config }) {
  const port = config.get('server.port');
  const timestamp = new Date().toISOString();
  return {
    last_updated: timestamp,
    collection_interval_in_millis: config.get('ops.interval'),
    uptime_in_millis: process.uptime() * 1000,
    process: {
      mem: {
        heap_max_in_bytes: _.get(event, 'psmem.heapTotal'),
        heap_used_in_bytes:  _.get(event, 'psmem.heapUsed')
      }
    },
    os: {
      cpu: {
        load_average: {
          '1m': _.get(event, 'osload.0'),
          '5m': _.get(event, 'osload.1'),
          '15m': _.get(event, 'osload.1')
        }
      }
    },
    response_times: {
      avg_in_millis:  _.get(event, ['responseTimes', port, 'avg']),
      max_in_millis: _.get(event, ['responseTimes', port, 'max'])
    },
    requests:  keysToSnakeCaseShallow(_.get(event, ['requests', port])),
    concurrent_connections: _.get(event, ['concurrents', port])
  };
}
