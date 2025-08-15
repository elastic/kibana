/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineLatest, type Observable } from 'rxjs';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { MetricsServiceSetup } from '@kbn/core-metrics-server';
import { type CoreStatus, type ServiceStatus, ServiceStatusLevels } from '@kbn/core-status-common';
import { type Gauge, metrics, ValueType } from '@opentelemetry/api';
import type { Stats } from '../../../common/types';

export const SNAPSHOT_REGEX = /-snapshot/i;

export const ServiceStatusToLegacyState: Stats.v1.KibanaServiceStatus = {
  [ServiceStatusLevels.critical.toString()]: 'red',
  [ServiceStatusLevels.unavailable.toString()]: 'red',
  [ServiceStatusLevels.degraded.toString()]: 'yellow',
  [ServiceStatusLevels.available.toString()]: 'green',
};

/**
 * Instrument OTel legacy metrics to make it easier to migrate from the Metricbeat stats collection
 * @param metricsServiceSetup The setup contract of the core Metrics service
 * @param overallStatus$ The overall status of the Kibana instance
 * @param config Static values to add to the attributes
 */
export function instrumentOtelLegacyMetrics(
  metricsServiceSetup: MetricsServiceSetup,
  overallStatus$: Observable<ServiceStatus>,
  coreStatus$: Observable<CoreStatus>,
  config: {
    kibanaIndex: string;
    kibanaVersion: string;
    uuid: string;
    server: {
      name: string;
      hostname: string;
      port: number;
    };
  }
) {
  const meter = metrics.getMeter('kibana.stats', config.kibanaVersion);

  const collectionIntervalGauge = meter.createGauge('collection_interval_ms', {
    description:
      'How often the metrics are calculated in Kibana (in milliseconds). Not necessarily the same as how often OTel ships the metrics (although recommended to have the same value).',
    // unit: 'ms',
    valueType: ValueType.INT,
  });

  const metricsMap = new Map<string, Gauge>();

  combineLatest([metricsServiceSetup.getOpsMetrics$(), overallStatus$, coreStatus$]).subscribe(
    ([opsMetrics, overallStatus, coreStatus]) => {
      const attributes = {
        // Labels (non-numeric signals) coming from the ops metrics
        'process.pid': opsMetrics.process.pid, // Providing it as an attribute as well as it might be more useful for filtering
        'kibana.stats.process.event_loop_delay_histogram.from_timestamp':
          opsMetrics.process.event_loop_delay_histogram.fromTimestamp,
        'kibana.stats.process.event_loop_delay_histogram.last_updated_at':
          opsMetrics.process.event_loop_delay_histogram.lastUpdatedAt,
        'kibana.stats.os.platform': opsMetrics.os.platform,
        'kibana.stats.os.platform_release': opsMetrics.os.platformRelease,
        'kibana.stats.os.distro': opsMetrics.os.distro,
        'kibana.stats.os.distro_release': opsMetrics.os.distroRelease,
        'kibana.stats.os.cpuacct.control_group': opsMetrics.os.cpuacct?.control_group,
        'kibana.stats.os.cpu.control_group': opsMetrics.os.cpu?.control_group,

        // From the /api/stats transformations
        'kibana.uuid': config.uuid,
        'kibana.name': config.server.name,
        'kibana.index': config.kibanaIndex,
        'kibana.host': config.server.hostname,
        'kibana.locale': i18n.getLocale(),
        'kibana.transport_address': `${config.server.hostname}:${config.server.port}`,
        'kibana.version': config.kibanaVersion.replace(SNAPSHOT_REGEX, ''),
        'kibana.snapshot': SNAPSHOT_REGEX.test(config.kibanaVersion),
        'kibana.status': ServiceStatusToLegacyState[overallStatus.level.toString()],
        last_updated: opsMetrics.collected_at.toISOString(),

        // Add fields specific to /api/status (to match the "status" metricset from Metricbeat)
        'kibana.status.overall.level': overallStatus.level.toString(),
        'kibana.status.overall.summary': overallStatus.summary,
        'kibana.status.core.elasticsearch.level': coreStatus.elasticsearch.level.toString(),
        'kibana.status.core.elasticsearch.summary': coreStatus.elasticsearch.summary,
        'kibana.status.core.savedObjects.level': coreStatus.savedObjects.level.toString(),
        'kibana.status.core.savedObjects.summary': coreStatus.savedObjects.summary,
      };

      collectionIntervalGauge.record(metricsServiceSetup.collectionInterval, attributes);

      for (const { key, metricName, description, valueType } of METRICS_TO_REPORT_MAPPINGS) {
        const value = get(opsMetrics, key);
        if (typeof value !== 'undefined') {
          if (!metricsMap.has(metricName)) {
            // Intentionally not registering `unit` to avoid OTel from splitting the metrics into multiple documents.
            metricsMap.set(metricName, meter.createGauge(metricName, { description, valueType }));
          }
          metricsMap.get(metricName)?.record(value, attributes);
        }
      }

      // Special case: `requests.statusCodes[code]`
      for (const [code, value] of Object.entries(opsMetrics.requests.statusCodes)) {
        const metricName = `kibana.stats.requests.status_codes.${code}`;
        if (!metricsMap.has(metricName)) {
          metricsMap.set(
            metricName,
            meter.createGauge(metricName, {
              description: `HTTP Server Requests: number of requests handled per status code "${code}"`,
              // unit: '1',
              valueType: ValueType.INT,
            })
          );
        }
        metricsMap.get(metricName)?.record(value, attributes);
      }
    }
  );
}

interface MetricToReport {
  key: string;
  metricName: string;
  description: string;
  unit: string;
  valueType: ValueType;
}

/**
 * Mapping of metrics to report to OTel in the same path names as Metricbeat "stats" metricset.
 * The key is the path to the metric in the `opsMetrics` object.
 * The metric (gauge) name matches the path of the data stored by the Metricbeat "stats" metricset.
 */
const METRICS_TO_REPORT_MAPPINGS: MetricToReport[] = [
  {
    key: 'elasticsearch_client.totalActiveSockets',
    metricName: 'kibana.stats.elasticsearch_client.total_active_sockets',
    description:
      'Elasticsearch Clients: Total number of active sockets (all nodes, all connections)',
    unit: '1',
    valueType: ValueType.INT,
  },
  {
    key: 'elasticsearch_client.totalIdleSockets',
    metricName: 'kibana.stats.elasticsearch_client.total_idle_sockets',
    description:
      'Elasticsearch Clients: Total number of available sockets (alive but idle, all nodes, all connections)',
    unit: '1',
    valueType: ValueType.INT,
  },
  {
    key: 'elasticsearch_client.totalQueuedRequests',
    metricName: 'kibana.stats.elasticsearch_client.total_queued_requests',
    description:
      'Elasticsearch Clients: Total number of queued requests (all nodes, all connections)',
    unit: '1',
    valueType: ValueType.INT,
  },
  // Not a metric per-se since it's static, but providing it to make it easier to migrate
  {
    key: 'process.pid',
    metricName: 'process.pid',
    description: 'Process PID',
    unit: '1',
    valueType: ValueType.INT,
  },
  {
    key: 'process.memory.heap.total_in_bytes',
    metricName: 'kibana.stats.process.memory.heap.total.bytes',
    description: 'Process Memory: Total heap available',
    unit: 'By',
    valueType: ValueType.INT,
  },
  {
    key: 'process.memory.heap.used_in_bytes',
    metricName: 'kibana.stats.process.memory.heap.used.bytes',
    description: 'Process Memory: Used heap',
    unit: 'By',
    valueType: ValueType.INT,
  },
  {
    key: 'process.memory.heap.size_limit',
    metricName: 'kibana.stats.process.memory.heap.size_limit.bytes',
    description: 'Process Memory: V8 Heap size limit',
    unit: 'By',
    valueType: ValueType.INT,
  },
  {
    key: 'process.memory.resident_set_size_in_bytes',
    metricName: 'kibana.stats.process.memory.resident_set_size.bytes',
    description: 'Process Memory: Node.js RSS',
    unit: 'By',
    valueType: ValueType.INT,
  },
  {
    key: 'process.memory.external_in_bytes',
    metricName: 'kibana.stats.process.memory.external.bytes',
    description:
      'Process Memory: memory usage of C++ objects bound to JavaScript objects managed by V8',
    unit: 'By',
    valueType: ValueType.INT,
  },
  {
    key: 'process.memory.array_buffers_in_bytes',
    metricName: 'kibana.stats.process.memory.array_buffers.bytes',
    description:
      'Process Memory: memory allocated for array buffers. This is also included in the external value',
    unit: 'By',
    valueType: ValueType.INT,
  },
  {
    key: 'process.event_loop_delay',
    metricName: 'kibana.stats.process.event_loop_delay.ms',
    description: 'Process Event Loop: max event loop delay since last collection',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'process.event_loop_delay_histogram.min',
    metricName: 'kibana.stats.process.event_loop_delay_histogram.min',
    description: 'Process Event Loop Delay: The minimum recorded event loop delay',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'process.event_loop_delay_histogram.max',
    metricName: 'kibana.stats.process.event_loop_delay_histogram.max',
    description: 'Process Event Loop Delay: The maximum recorded event loop delay',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'process.event_loop_delay_histogram.mean',
    metricName: 'kibana.stats.process.event_loop_delay_histogram.mean',
    description: 'Process Event Loop Delay: The mean of the recorded event loop delays',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'process.event_loop_delay_histogram.exceeds',
    metricName: 'kibana.stats.process.event_loop_delay_histogram.exceeds',
    description:
      'Process Event Loop Delay: The number of times the event loop delay exceeded the maximum 1h event loop delay threshold',
    unit: '1',
    valueType: ValueType.INT,
  },
  {
    key: 'process.event_loop_delay_histogram.stddev',
    metricName: 'kibana.stats.process.event_loop_delay_histogram.stddev',
    description:
      'Process Event Loop Delay: The standard deviation of the recorded event loop delays',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'process.event_loop_delay_histogram.percentiles.50',
    metricName: 'kibana.stats.process.event_loop_delay_histogram.percentiles.50',

    description: 'Process Event Loop Delay: 50th percentile of delays of the collected data points',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'process.event_loop_delay_histogram.percentiles.75',
    metricName: 'kibana.stats.process.event_loop_delay_histogram.percentiles.75',
    description: 'Process Event Loop Delay: 75th percentile of delays of the collected data points',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'process.event_loop_delay_histogram.percentiles.95',
    metricName: 'kibana.stats.process.event_loop_delay_histogram.percentiles.95',
    description: 'Process Event Loop Delay: 95th percentile of delays of the collected data points',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'process.event_loop_delay_histogram.percentiles.99',
    metricName: 'kibana.stats.process.event_loop_delay_histogram.percentiles.99',
    description: 'Process Event Loop Delay: 99th percentile of delays of the collected data points',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'process.event_loop_utilization.idle',
    metricName: 'kibana.stats.process.event_loop_utilization.idle',
    description: 'Process Event Loop Utilization: time in which the event loop is idle',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'process.event_loop_utilization.active',
    metricName: 'kibana.stats.process.event_loop_utilization.active',
    description: 'Process Event Loop Utilization: time in which the event loop is active',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'process.event_loop_utilization.utilization',
    metricName: 'kibana.stats.process.event_loop_utilization.utilization',
    description: 'Process Event Loop Utilization: total utilization',
    unit: '1',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'process.uptime_in_millis',
    metricName: 'kibana.stats.process.uptime.ms',
    description: 'Process: time since the process started',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'os.load.1m',
    metricName: 'kibana.stats.os.load.1m',
    description: "OS: Host's load for the last minute",
    unit: '%',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'os.load.5m',
    metricName: 'kibana.stats.os.load.5m',
    description: "OS: Host's load for the last 5 minutes",
    unit: '%',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'os.load.15m',
    metricName: 'kibana.stats.os.load.15m',
    description: "OS: Host's load for the last 15 minutes",
    unit: '%',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'os.memory.total_in_bytes',
    metricName: 'kibana.stats.os.memory.total_in_bytes',
    description: "OS: Host's total available memory",
    unit: 'By',
    valueType: ValueType.INT,
  },
  {
    key: 'os.memory.free_in_bytes',
    metricName: 'kibana.stats.os.memory.free_in_bytes',
    description: "OS: Host's free memory",
    unit: 'By',
    valueType: ValueType.INT,
  },
  {
    key: 'os.memory.used_in_bytes',
    metricName: 'kibana.stats.os.memory.used_in_bytes',
    description: "OS: Host's used memory",
    unit: 'By',
    valueType: ValueType.INT,
  },
  {
    key: 'os.uptime_in_millis',
    metricName: 'kibana.stats.os.uptime.ms',
    description: "OS: Host's uptime in milliseconds",
    unit: 'ms',
    valueType: ValueType.INT,
  },
  {
    key: 'os.cpuacct.usage_nanos',
    metricName: 'kibana.stats.os.cpuacct.usage_nanos',
    description: "OS CPU cgroup accounting: CPU time used by this process's cgroup",
    unit: 'ns',
    valueType: ValueType.INT,
  },
  {
    key: 'os.cpu.cfs_period_micros',
    metricName: 'kibana.stats.os.cpu.cfs_period_micros',
    description: 'OS CPU cgroup: the length of the cfs period in microseconds',
    unit: 'us',
    valueType: ValueType.INT,
  },
  {
    key: 'os.cpu.cfs_quota_micros',
    metricName: 'kibana.stats.os.cpu.cfs_quota_micros',
    description: 'OS CPU cgroup: total available run-time within a cfs period in microseconds',
    unit: 'us',
    valueType: ValueType.INT,
  },
  {
    key: 'os.cpu.stat.number_of_elapsed_periods',
    metricName: 'kibana.stats.os.cpu.stat.number_of_elapsed_periods',
    description: 'OS CPU cgroup: number of cfs periods that elapsed',
    unit: '1',
    valueType: ValueType.INT,
  },
  {
    key: 'os.cpu.stat.number_of_times_throttled',
    metricName: 'kibana.stats.os.cpu.stat.number_of_times_throttled',
    description: 'OS CPU cgroup: number of times the cgroup has been throttled',
    unit: '1',
    valueType: ValueType.INT,
  },
  {
    key: 'os.cpu.time_throttled_nanos',
    metricName: 'kibana.stats.os.cpu.time_throttled_nanos',
    description:
      'OS CPU cgroup: total amount of time the cgroup has been throttled for in nanoseconds',
    unit: 'ns',
    valueType: ValueType.INT,
  },
  {
    key: 'os.cgroup_memory.current_in_bytes',
    metricName: 'kibana.stats.os.cgroup_memory.current_bytes',
    description:
      'OS CPU cgroup: total amount of memory currently being used by the cgroup and its descendants',
    unit: 'By',
    valueType: ValueType.INT,
  },
  {
    key: 'os.cgroup_memory.swap_current_in_bytes',
    metricName: 'kibana.stats.os.cgroup_memory.swap_current_bytes',
    description:
      'OS CPU cgroup: total amount of swap currently being used by the cgroup and its descendants',
    unit: 'By',
    valueType: ValueType.INT,
  },
  {
    key: 'response_times.avg_in_millis',
    metricName: 'kibana.stats.response_times.avg.ms',
    description: 'HTTP Server Response: average response time',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  },
  {
    key: 'response_times.max_in_millis',
    metricName: 'kibana.stats.response_times.max.ms',
    description: 'HTTP Server Response: maximum response time',
    unit: 'ms',
    valueType: ValueType.INT,
  },
  {
    key: 'requests.disconnects',
    metricName: 'kibana.stats.requests.disconnects',
    description: 'HTTP Server Requests: number of disconnected requests since startup',
    unit: '1',
    valueType: ValueType.INT,
  },
  {
    key: 'requests.total',
    metricName: 'kibana.stats.requests.total',
    description: 'HTTP Server Requests: number of requests handled since startup',
    unit: '1',
    valueType: ValueType.INT,
  },
  {
    key: 'concurrent_connections',
    metricName: 'kibana.stats.concurrent_connections',
    description: 'HTTP Server: number of current concurrent connections to the server',
    unit: '1',
    valueType: ValueType.INT,
  },
];
