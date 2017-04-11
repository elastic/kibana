import { get, set, isObject } from 'lodash';
import Samples from './samples';
import { keysToSnakeCaseShallow } from '../../utils/case_conversion';
import { getAllStats as cGroupStats } from './cgroup';

let cGroupStatsAvailable = true;

export function collectMetrics(kbnServer, server, config) {
  let lastReport = Date.now();
  kbnServer.legacyMetrics = new Samples(12);

  server.plugins['even-better'].monitor.on('ops', event => {
    getMetrics(event, config, server).then(data => { kbnServer.metrics = data; });

    const now = Date.now();
    const secSinceLast = (now - lastReport) / 1000;
    lastReport = now;

    const port = config.get('server.port');
    const requests = get(event, ['requests', port, 'total'], 0);
    const requestsPerSecond = requests / secSinceLast;

    kbnServer.legacyMetrics.add({
      heapTotal: get(event, 'psmem.heapTotal'),
      heapUsed: get(event, 'psmem.heapUsed'),
      load: event.osload,
      responseTimeAvg: get(event, ['responseTimes', port, 'avg']),
      responseTimeMax: get(event, ['responseTimes', port, 'max']),
      requestsPerSecond: requestsPerSecond
    });

  });
}

export async function getMetrics(event, config, server) {
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
          '15m': get(event, 'osload.2')
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

    try {
      const cgroup = await cGroupStats({
        cpuPath: config.get('cpu.cgroup.path.override'),
        cpuAcctPath: config.get('cpuacct.cgroup.path.override')
      });

      if (isObject(cgroup)) {
        return cgroup;
      }

      cGroupStatsAvailable = false;
    } catch (e) {
      server.log(['error', 'metrics', 'cgroup'], e);
    }
  }

  if (isObject(cgroup)) {
    set(metrics, 'os.cgroup', cgroup);
  }

  return metrics;
}
