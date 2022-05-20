/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { OpsProcessMetrics, OpsOsMetrics, OpsServerMetrics } from './collectors';

export interface OpsMetricsEvent {
  /** Time metrics were recorded at. */
  collected_at: Date;
  /** Process related metrics. */
  single_process: OpsProcessMetrics;
  /** OS related metrics */
  os: OpsOsMetrics;
  /** server response time stats */
  response_times: OpsServerMetrics['response_times'];
  /** server requests stats */
  requests: OpsServerMetrics['requests'];
  /** number of current concurrent connections to the server */
  concurrent_connections: OpsServerMetrics['concurrent_connections'];
}

const processSchema: RootSchema<OpsProcessMetrics> = {
  pid: {
    type: 'long',
    _meta: { description: 'pid of the kibana process' },
  },
  memory: {
    properties: {
      heap: {
        properties: {
          total_in_bytes: {
            type: 'byte',
            _meta: { description: 'total heap available' },
          },
          used_in_bytes: {
            type: 'byte',
            _meta: { description: 'used heap' },
          },
          size_limit: {
            type: 'byte',
            _meta: { description: 'v8 heap size limit' },
          },
        },
      },
      resident_set_size_in_bytes: {
        type: 'byte',
        _meta: { description: 'node rss' },
      },
    },
    _meta: {
      description: 'heap memory usage',
      optional: false,
    },
  },
  event_loop_delay: {
    type: 'double',
    _meta: { description: 'mean event loop delay since last collection' },
  },
  event_loop_delay_histogram: {
    properties: {
      fromTimestamp: {
        type: 'date',
        _meta: {
          description:
            'The first timestamp the interval timer kicked in for collecting data points.',
        },
      },
      lastUpdatedAt: {
        type: 'date',
        _meta: {
          description: 'Last timestamp the interval timer kicked in for collecting data points.',
        },
      },
      min: {
        type: 'double',
        _meta: { description: 'The minimum recorded event loop delay.' },
      },
      max: {
        type: 'long',
        _meta: { description: 'The maximum recorded event loop delay.' },
      },
      mean: {
        type: 'long',
        _meta: { description: 'The mean of the recorded event loop delays.' },
      },
      exceeds: {
        type: 'long',
        _meta: {
          description:
            'The number of times the event loop delay exceeded the maximum 1 hour event loop delay threshold.',
        },
      },
      stddev: {
        type: 'long',
        _meta: { description: 'The standard deviation of the recorded event loop delays.' },
      },
      percentiles: {
        properties: {
          '50': {
            type: 'long',
            _meta: { description: '50th percentile of delays of the collected data points.' },
          },
          '75': {
            type: 'long',
            _meta: { description: '75th percentile of delays of the collected data points.' },
          },
          '95': {
            type: 'long',
            _meta: { description: '95th percentile of delays of the collected data points.' },
          },
          '99': {
            type: 'long',
            _meta: { description: '99th percentile of delays of the collected data points.' },
          },
        },
        _meta: {
          description: 'An object detailing the accumulated percentile distribution.',
          optional: false,
        },
      },
    },
    _meta: {
      description: 'node event loop delay histogram since last collection',
      optional: false,
    },
  },
  uptime_in_millis: {
    type: 'long',
    _meta: { description: 'uptime of the kibana process' },
  },
};

export const opsMetricsEventSchema: RootSchema<OpsMetricsEvent> = {
  collected_at: {
    type: 'date',
    _meta: { description: 'Time metrics were recorded at.' },
  },
  single_process: {
    properties: processSchema,
    _meta: {
      description: 'Process related metrics.',
      optional: false,
    },
  },
  os: {
    properties: {
      platform: {
        type: 'keyword',
        _meta: { description: 'The os platform' },
      },
      platformRelease: {
        type: 'keyword',
        _meta: { description: 'The os platform release, prefixed by the platform name ' },
      },
      distro: {
        type: 'keyword',
        _meta: {
          description: 'The os distribution. Only present for linux platform',
          optional: true,
        },
      },
      distroRelease: {
        type: 'keyword',
        _meta: {
          description:
            'The os distrib release, prefixed by the os distrib. Only present for linux platforms',
          optional: true,
        },
      },
      load: {
        properties: {
          '1m': {
            type: 'long',
            _meta: { description: 'load for last minute' },
          },
          '5m': {
            type: 'long',
            _meta: { description: 'load for last five minutes' },
          },
          '15m': {
            type: 'long',
            _meta: { description: 'load for last fifteen minutes' },
          },
        },
        _meta: {
          description: 'cpu load metrics',
          optional: false,
        },
      },
      memory: {
        properties: {
          total_in_bytes: {
            type: 'long',
            _meta: { description: 'total memory available' },
          },
          free_in_bytes: {
            type: 'byte',
            _meta: { description: 'current free memory' },
          },
          used_in_bytes: {
            type: 'byte',
            _meta: { description: 'current used memory' },
          },
        },
      },
      uptime_in_millis: {
        type: 'long',
        _meta: { description: 'the OS uptime' },
      },
      cpuacct: {
        properties: {
          control_group: {
            type: 'text',
            _meta: { description: "name of this process's cgroup" },
          },
          usage_nanos: {
            type: 'date',
            _meta: { description: "cpu time used by this process's cgroup" },
          },
        },
        _meta: {
          description: 'cpu accounting metrics, undefined when not running in a cgroup',
          optional: true,
        },
      },
      cpu: {
        properties: {
          control_group: {
            type: 'text',
            _meta: { description: "name of this process's cgroup" },
          },
          cfs_period_micros: {
            type: 'long',
            _meta: { description: 'the length of the cfs period' },
          },
          cfs_quota_micros: {
            type: 'long',
            _meta: { description: 'total available run-time within a cfs period' },
          },
          stat: {
            properties: {
              number_of_elapsed_periods: {
                type: 'long',
                _meta: { description: 'number of cfs periods that elapsed' },
              },
              number_of_times_throttled: {
                type: 'long',
                _meta: { description: 'number of times the cgroup has been throttled' },
              },
              time_throttled_nanos: {
                type: 'long',
                _meta: {
                  description: 'total amount of time the cgroup has been throttled for',
                },
              },
            },
            _meta: {
              description: 'current stats on the cfs periods',
              optional: false,
            },
          },
        },
        _meta: {
          description: 'cpu accounting metrics, undefined when not running in a cgroup',
          optional: true,
        },
      },
    },
  },
  response_times: {
    properties: {
      avg_in_millis: {
        type: 'long',
        _meta: { description: 'average response time' },
      },
      max_in_millis: {
        type: 'long',
        _meta: { description: 'maximum response time' },
      },
    },
  },
  requests: {
    properties: {
      disconnects: {
        type: 'long',
        _meta: { description: 'number of disconnected requests since startup' },
      },
      total: {
        type: 'long',
        _meta: { description: 'total number of requests handled since startup' },
      },
      statusCodes: {
        // the responses can vary so we use a pass_through here
        type: 'pass_through',
        _meta: {
          description:
            'number of request handled per response status code as status_code:number pairs, for example: {"200": 3} ',
          optional: false,
        },
      },
    },
  },
  concurrent_connections: {
    type: 'long',
    _meta: { description: 'number of concurrent connections to the server' },
  },
};
