/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Runtime } from '../../types';
import type { InfraDatabase } from '../../constants';

export interface MessagePool {
  warn: string[];
  error: string[];
}

export type RuntimeMessagePool = Partial<Record<Runtime, MessagePool>>;

// All 4 runtimes: behaviors genuinely differ (goroutine panic vs unhandled exception vs heap).
export const INTERNAL_SERVER_ERROR: RuntimeMessagePool = {
  go: {
    warn: [`level=warn msg="goroutine count elevated" count=450 limit=1000`],
    error: [
      `level=error msg="recovered from panic" error="runtime error: invalid memory address or nil pointer dereference" request_id={request_id}`,
    ],
  },
  python: {
    warn: [`WARNING  app.health  heap size approaching limit used_mb=480 limit_mb=512`],
    error: [`ERROR    app.handler  Unhandled exception in process_request request_id={request_id}`],
  },
  java: {
    warn: [
      `[{thread}] WARN  {app_pkg}.HealthCheck - Thread pool nearing saturation active=48 max=50`,
    ],
    error: [
      `[{thread}] ERROR {app_pkg}.RequestHandler - Unhandled exception processing request rid={request_id}`,
    ],
  },
  node: {
    warn: [`{"level":"warn","msg":"event loop lag detected","lagMs":85}`],
    error: [
      `{"level":"error","msg":"unhandled error in request handler","status":"{status}","err":{"type":"TypeError","message":"Cannot read properties of undefined"},"reqId":"{request_id}"}`,
    ],
  },
};

// postgres: all 4 runtimes (most-used dep; tech-specific client details differ meaningfully).
// mongodb / elasticsearch: go + node only; python/java fall back to go via resolveMessagePool.
export const DB_TIMEOUT: Record<InfraDatabase, RuntimeMessagePool> = {
  postgres: {
    go: {
      warn: [
        `level=warn msg="pgx: connection pool approaching limit" idle=1 total=10 host={db_host} rid={request_id}`,
      ],
      error: [
        `level=error msg="pgx: connection pool exhausted" host={db_host} waiting=48 idle=0 total=10 rid={request_id}`,
      ],
    },
    python: {
      warn: [
        `WARNING  app.db  SQLAlchemy pool pre_ping failed, retrying host={db_host} rid={request_id}`,
      ],
      error: [
        `ERROR    app.db  psycopg2.OperationalError: could not connect to server: Connection timed out host={db_host} rid={request_id}`,
      ],
    },
    java: {
      warn: [
        `[{thread}] WARN  {app_pkg}.Repository - HikariPool: connection pool at 90% capacity host={db_host} rid={request_id}`,
      ],
      error: [
        `[{thread}] ERROR {app_pkg}.Repository - com.zaxxer.hikari.pool.HikariPool$PoolEntryCreator: Connection pool exhausted waitingCount=48 totalConnections=10 host={db_host} rid={request_id}`,
      ],
    },
    node: {
      warn: [
        `{"level":"warn","msg":"pg pool approaching limit","idleCount":1,"totalCount":10,"host":"{db_host}","reqId":"{request_id}"}`,
      ],
      error: [
        `{"level":"error","msg":"pg connection pool exhausted","waitingCount":48,"idleCount":0,"totalCount":10,"host":"{db_host}","reqId":"{request_id}"}`,
      ],
    },
  },
  mongodb: {
    go: {
      warn: [
        `level=warn msg="mongo: connection pool approaching limit" idle=1 total=10 host={db_host}`,
      ],
      error: [
        `level=error msg="mongo: context deadline exceeded" op=find collection={table} rid={request_id}`,
      ],
    },
    node: {
      warn: [
        `{"level":"warn","msg":"mongodb pool saturation","active":9,"total":10,"host":"{db_host}"}`,
      ],
      error: [
        `{"level":"error","msg":"mongodb operation timeout","collection":"{table}","host":"{db_host}","reqId":"{request_id}"}`,
      ],
    },
  },
  elasticsearch: {
    go: {
      warn: [`level=warn msg="es: connection pool saturation" idle=0 total=5 host={db_host}`],
      error: [
        `level=error msg="es: context deadline exceeded" op=search index={table} rid={request_id}`,
      ],
    },
    node: {
      warn: [
        `{"level":"warn","msg":"elasticsearch pool saturation","idle":0,"total":5,"host":"{db_host}"}`,
      ],
      error: [
        `{"level":"error","msg":"elasticsearch timeout","index":"{table}","host":"{db_host}","reqId":"{request_id}"}`,
      ],
    },
  },
};

// go + node only for cascade/k8s types: format-only variation, others fall back to go.
export const BAD_GATEWAY: RuntimeMessagePool = {
  go: {
    warn: [`level=warn msg="upstream health degraded" target={upstream_host} consecutive_errors=3`],
    error: [
      `level=error msg="bad gateway" target={upstream_host} upstream_status={upstream_status} rid={request_id}`,
    ],
  },
  node: {
    warn: [
      `{"level":"warn","msg":"upstream health degraded","target":"{upstream_host}","consecutiveErrors":3}`,
    ],
    error: [
      `{"level":"error","msg":"upstream returned error","target":"{upstream_host}","upstreamStatus":{upstream_status},"reqId":"{request_id}"}`,
    ],
  },
};

export const GATEWAY_TIMEOUT: RuntimeMessagePool = {
  go: {
    warn: [
      `level=warn msg="circuit breaker: error rate approaching threshold" target={upstream_host} rate=0.22`,
    ],
    error: [
      `level=error msg="context deadline exceeded calling downstream" target={upstream_host} rid={request_id}`,
    ],
  },
  node: {
    warn: [
      `{"level":"warn","msg":"circuit breaker threshold approaching","target":"{upstream_host}","errorRate":0.22}`,
    ],
    error: [
      `{"level":"error","msg":"downstream timeout","target":"{upstream_host}","err":{"type":"Error","message":"4 DEADLINE_EXCEEDED: Deadline exceeded"},"reqId":"{request_id}"}`,
    ],
  },
};

// K8s types only emit warns (error arrays are empty); go + node covers both main log formats.
export const K8S_OOM: RuntimeMessagePool = {
  go: {
    warn: [`level=warn msg="memory usage approaching container limit" used_mb=460 limit_mb=512`],
    error: [],
  },
  node: {
    warn: [`{"level":"warn","msg":"heap approaching container limit","usedMb":460,"limitMb":512}`],
    error: [],
  },
};

export const K8S_CRASH_LOOP_BACK: RuntimeMessagePool = {
  go: {
    warn: [`level=warn msg="liveness probe failing" consecutive=2 path=/healthz`],
    error: [],
  },
  node: {
    warn: [`{"level":"warn","msg":"liveness probe failing","consecutive":2,"path":"/healthz"}`],
    error: [],
  },
};

export interface ServiceMessages {
  internal_error: RuntimeMessagePool;
  db_timeout: Record<InfraDatabase, RuntimeMessagePool>;
  bad_gateway: RuntimeMessagePool;
  gateway_timeout: RuntimeMessagePool;
  k8s_oom: RuntimeMessagePool;
  k8s_crash_loop_back: RuntimeMessagePool;
}

export const SERVICE_MESSAGES: ServiceMessages = {
  internal_error: INTERNAL_SERVER_ERROR,
  db_timeout: DB_TIMEOUT,
  bad_gateway: BAD_GATEWAY,
  gateway_timeout: GATEWAY_TIMEOUT,
  k8s_oom: K8S_OOM,
  k8s_crash_loop_back: K8S_CRASH_LOOP_BACK,
};

/** Error types whose message pools are keyed by infra technology rather than directly by Runtime. */
export const TECH_KEYED_ERROR_TYPES = new Set<keyof ServiceMessages>(['db_timeout']);
