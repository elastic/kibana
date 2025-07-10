/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpsProcessMetrics } from '@kbn/core-metrics-server';
import { mocked } from './event_loop_delays_monitor.mocks';

export function createMockOpsProcessMetrics(): OpsProcessMetrics {
  const histogram = mocked.createHistogram();

  return {
    memory: {
      heap: { total_in_bytes: 1, used_in_bytes: 1, size_limit: 1 },
      resident_set_size_in_bytes: 1,
      external_in_bytes: 1,
      array_buffers_in_bytes: 1,
    },
    event_loop_delay: 1,
    event_loop_delay_histogram: histogram,
    event_loop_utilization: {
      active: 1,
      idle: 1,
      utilization: 1,
    },
    pid: 1,
    uptime_in_millis: 1,
  };
}
