/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraCache } from '../constants';
import type { AppPool, InfraPool, TechPool } from '../types';

export const CACHE: Record<InfraCache, TechPool<InfraPool<'eviction'>, AppPool>> = {
  redis: {
    infra: {
      healthy: [
        `1:M {timestamp} * 100 changes in 300 seconds. Saving...`,
        `118:C {timestamp} * DB saved on disk`,
        `1:M {timestamp} * Background saving terminated with success`,
        `1:M {timestamp} * Ready to accept connections tcp`,
      ],
      eviction: {
        warn: [
          `1:M {timestamp} # OOM command not allowed when used memory > 'maxmemory'.`,
          `1:M {timestamp} # WARNING: Can't save in background: fork: Cannot allocate memory`,
        ],
        error: [
          `1:M {timestamp} # Connection from {db_host} closed: Connection reset by peer`,
          `1:M {timestamp} # Error accepting a client connection: accept: Too many open files in system`,
        ],
      },
    },
    app: {
      success: {
        go: [
          `{"level":"info","msg":"CacheStore.GetAsync","key":"{request_id}","hit":true,"ttl_s":300}`,
        ],
        python: [
          `INFO     app.{app_snake}.cache  CacheStore.get key={request_id} hit=True ttl=300`,
        ],
        java: [
          `[{thread}] INFO  {app_pkg}.CacheStore - setAsync key={request_id} ttl_s=300 trace_id={request_id} trace_flags=01`,
        ],
        node: [`{"level":"info","msg":"CacheStore.setAsync","key":"{request_id}","ttl_s":300}`],
      },
    },
  },
};
