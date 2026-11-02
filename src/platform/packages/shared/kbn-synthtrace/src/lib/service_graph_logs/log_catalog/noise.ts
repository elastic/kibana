/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NoiseHealthState, Runtime } from '../types';

export const NOISE: Record<NoiseHealthState, Partial<Record<Runtime, string[]>>> = {
  healthy: {
    go: [
      `level=info msg="connection pool snapshot" active=3 idle=5 total=8 host={infra_host}`,
      `level=info msg="periodic heartbeat ok" uptime_h=48 goroutines=12`,
    ],
    python: [
      `INFO     app.pool  Connection pool: active=3/8 idle=5 avg_wait_ms=1 host={infra_host}`,
      `INFO     app.health  periodic heartbeat ok uptime_h=48 threads=8`,
    ],
    java: [
      `[{thread}] INFO  {app_pkg}.PoolMonitor - ConnectionPool stats: active=3/8 idle=5 waiting=0 host={infra_host}`,
      `[{thread}] INFO  {app_pkg}.HealthCheck - periodic heartbeat ok: uptime=48h threads=8`,
    ],
    node: [
      `{"level":"info","msg":"pool stats","active":3,"idle":5,"total":8,"host":"{infra_host}"}`,
      `{"level":"info","msg":"periodic heartbeat ok","uptime_h":48,"heap_mb":120}`,
    ],
  },
  degraded: {
    go: [
      `level=warn msg="connection pool nearing capacity" active=7 max=8 checkout_wait_ms=42 host={infra_host}`,
      `level=warn msg="GC pause exceeding threshold" pause_ms=42 heap_mb=480`,
    ],
    python: [
      `WARNING  app.pool  Pool nearing capacity: active=7/8 checkout_wait_ms=42 host={infra_host}`,
      `WARNING  app.gc  GC pressure elevated pause_ms=42 heap_mb=480 frequency=elevated`,
    ],
    java: [
      `[{thread}] WARN  {app_pkg}.PoolMonitor - ConnectionPool nearing capacity: active=7/8 checkout_wait=42ms host={infra_host}`,
      `[{thread}] WARN  {app_pkg}.GcMonitor - GC pause exceeding threshold: pauseMs=42 heapMb=480 gcType=G1YoungGeneration`,
    ],
    node: [
      `{"level":"warn","msg":"pool nearing capacity","active":7,"max":8,"checkoutWaitMs":42,"host":"{infra_host}"}`,
      `{"level":"warn","msg":"event loop lag elevated","p99_ms":42}`,
    ],
  },
};
