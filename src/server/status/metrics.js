import { get, set, isObject } from 'lodash';
import { keysToSnakeCaseShallow } from '../../utils/case_conversion';
import { getAllStats as cGroupStats } from './cgroup';

let cGroupStatsAvailable = true;

export function collectMetrics(kbnServer, server, config) {
  server.plugins['even-better'].monitor.on('ops', function (event) {
    getMetrics({ event, config }).then(data => { kbnServer.metrics = data; });
  });
}

export async function getMetrics({ event, config }) {
  const port = config.get('server.port');
  const timestamp = new Date().toISOString();
  const cgroup = await cGroupStatsIfAvailable();

  const metrics = {
    last_updated: timestamp,
    collection_interval_in_millis: config.get('ops.interval'),
    uptime_in_millis: process.uptime() * 1000,
    process: {
      mem: {
        heap_max_in_bytes: get(event, 'psmem.heapTotal'),
        heap_used_in_bytes:  get(event, 'psmem.heapUsed')
      }
    },
    os: {
      cpu: {
        load_average: {
          '1m': get(event, 'osload.0'),
          '5m': get(event, 'osload.1'),
          '15m': get(event, 'osload.1')
        }
      }
    },
    response_times: {
      avg_in_millis:  get(event, ['responseTimes', port, 'avg']),
      max_in_millis: get(event, ['responseTimes', port, 'max'])
    },
    requests:  keysToSnakeCaseShallow(get(event, ['requests', port])),
    concurrent_connections: get(event, ['concurrents', port])
  };

  async function cGroupStatsIfAvailable() {
    if (!cGroupStatsAvailable) {
      return;
    }

    const cgroup = await cGroupStats();

    if (isObject(cgroup)) {
      return cgroup;
    }

    cGroupStatsAvailable = false;
  }

  if (isObject(cgroup)) {
    set(metrics, 'os.cgroup', cgroup);
  }

  return metrics;
}
