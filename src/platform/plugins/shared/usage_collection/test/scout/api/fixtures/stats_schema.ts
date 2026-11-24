/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

const processSchema = schema.object({
  pid: schema.number(),
  uptime_ms: schema.number(),
  event_loop_delay: schema.number(),
  event_loop_delay_histogram: schema.object({
    min: schema.number(),
    mean: schema.number(),
    exceeds: schema.number(),
    stddev: schema.number(),
    max: schema.number(),
    from_timestamp: schema.string(),
    last_updated_at: schema.string(),
    percentiles: schema.object({
      50: schema.number(),
      75: schema.number(),
      90: schema.number(),
      95: schema.number(),
      99: schema.number(),
    }),
  }),
  event_loop_utilization: schema.object({
    active: schema.number(),
    idle: schema.number(),
    utilization: schema.number(),
  }),
  memory: schema.object({
    heap: schema.object({
      total_bytes: schema.number(),
      used_bytes: schema.number(),
      size_limit: schema.number(),
    }),
    resident_set_size_bytes: schema.number(),
    external_bytes: schema.number(),
    array_buffers_bytes: schema.number(),
  }),
});

const baseResponseSchema = schema.object({
  last_updated: schema.string(),
  collection_interval_ms: schema.number(),
  // The collectors registered on the server decide what `usage` holds, so only its type is checked.
  usage: schema.object({}, { unknowns: 'allow' }),
  kibana: schema.object({
    name: schema.string(),
    uuid: schema.string(),
    host: schema.string(),
    index: schema.string(),
    locale: schema.string(),
    transport_address: schema.string(),
    version: schema.string(),
    snapshot: schema.boolean(),
    status: schema.string(),
  }),
  process: processSchema,
  processes: schema.arrayOf(processSchema),
  os: schema.object({
    platform: schema.string(),
    platform_release: schema.string(),
    distro: schema.maybe(schema.string()),
    distro_release: schema.maybe(schema.string()),
    memory: schema.object({
      free_bytes: schema.number(),
      used_bytes: schema.number(),
      total_bytes: schema.number(),
    }),
    uptime_ms: schema.number(),
    load: schema.object({
      '1m': schema.number(),
      '5m': schema.number(),
      '15m': schema.number(),
    }),
    cpuacct: schema.maybe(
      schema.object({
        control_group: schema.string(),
        usage_nanos: schema.number(),
      })
    ),
    cpu: schema.maybe(
      schema.object({
        control_group: schema.string(),
        cfs_period_micros: schema.number(),
        cfs_quota_micros: schema.number(),
        stat: schema.object({
          number_of_elapsed_periods: schema.number(),
          number_of_times_throttled: schema.number(),
          time_throttled_nanos: schema.number(),
        }),
      })
    ),
    cgroup_memory: schema.maybe(
      schema.object({
        current_bytes: schema.number(),
        swap_current_bytes: schema.number(),
      })
    ),
  }),
  elasticsearch_client: schema.object({
    total_active_sockets: schema.number(),
    total_idle_sockets: schema.number(),
    total_queued_requests: schema.number(),
  }),
  response_times: schema.object({
    avg_ms: schema.maybe(schema.number()),
    max_ms: schema.maybe(schema.number()),
  }),
  requests: schema.object({
    total: schema.number(),
    disconnects: schema.number(),
    status_codes: schema.recordOf(schema.string(), schema.number()),
  }),
  concurrent_connections: schema.number(),
});

export const statsResponseSchema = baseResponseSchema.extends({
  cluster_uuid: schema.maybe(schema.string()),
});

export const legacyStatsResponseSchema = baseResponseSchema.extends({
  clusterUuid: schema.string(),
});
