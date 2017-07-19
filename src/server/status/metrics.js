import { get, isObject, merge } from 'lodash';
import { keysToSnakeCaseShallow } from '../../utils/case_conversion';
import { getAllStats as cGroupStats } from './cgroup';

export class Metrics {
  constructor(config, server) {
    this.config = config;
    this.server = server;
    this.checkCGroupStats = true;
  }

  async capture(hapiEvent) {
    const timestamp = new Date().toISOString();
    const event = this.captureEvent(hapiEvent);
    const cgroup = await this.captureCGroupsIfAvailable();

    const metrics = {
      last_updated: timestamp,
      collection_interval_in_millis: this.config.get('ops.interval'),
      uptime_in_millis: process.uptime() * 1000,
    };

    return merge(metrics, event, cgroup);
  }

  captureEvent(hapiEvent) {
    const port = this.config.get('server.port');

    return {
      process: {
        mem: {
          heap_max_in_bytes: get(hapiEvent, 'psmem.heapTotal'),
          heap_used_in_bytes:  get(hapiEvent, 'psmem.heapUsed')
        }
      },
      os: {
        cpu: {
          load_average: {
            '1m': get(hapiEvent, 'osload.0'),
            '5m': get(hapiEvent, 'osload.1'),
            '15m': get(hapiEvent, 'osload.2')
          }
        }
      },
      response_times: {
        avg_in_millis:  get(hapiEvent, ['responseTimes', port, 'avg']),
        max_in_millis: get(hapiEvent, ['responseTimes', port, 'max'])
      },
      requests:  keysToSnakeCaseShallow(get(hapiEvent, ['requests', port])),
      concurrent_connections: get(hapiEvent, ['concurrents', port])
    };
  }

  async captureCGroups() {
    try {
      const cgroup = await cGroupStats({
        cpuPath: this.config.get('cpu.cgroup.path.override'),
        cpuAcctPath: this.config.get('cpuacct.cgroup.path.override')
      });

      if (isObject(cgroup)) {
        return {
          os: {
            cgroup
          }
        };
      }
    } catch (e) {
      this.server.log(['error', 'metrics', 'cgroup'], e);
    }
  }

  async captureCGroupsIfAvailable() {
    if (this.checkCGroupStats === true) {
      const cgroup = await this.captureCGroups();

      if (isObject(cgroup)) {
        return cgroup;
      }

      this.checkCGroupStats = false;
    }
  }
}
