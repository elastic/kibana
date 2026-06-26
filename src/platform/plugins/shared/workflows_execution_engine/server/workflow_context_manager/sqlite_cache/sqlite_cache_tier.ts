/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { JsonValue } from '@kbn/utility-types';
import type { CacheTier } from './cache_tier';
import type { SqliteCacheClient } from './sqlite_cache_client';

/**
 * CacheTier implementation backed by the SQLite worker thread.
 *
 * One instance is created per workflow execution (in setup_dependencies.ts).
 * The underlying SqliteCacheClient is a process-lifetime singleton shared
 * across all concurrent executions — rows are namespaced by workflowRunId.
 *
 * - put() is fire-and-forget: the worker's FIFO queue guarantees ordering
 *   relative to subsequent get() calls for the same step within one process.
 * - get() resolves to an empty Map on timeout or worker degradation; callers
 *   fall back to the ES rehydration path for missing ids.
 * - dispose() is a no-op: the worker is owned by SqliteCacheClient;
 *   plugin.stop() calls SqliteCacheClient.shutdown() instead.
 */
export class SqliteCacheTier implements CacheTier {
  public readonly spills = true as const;

  private readonly client: SqliteCacheClient;
  private readonly workflowRunId: string;
  private readonly logger: Logger;

  constructor(client: SqliteCacheClient, workflowRunId: string, logger: Logger) {
    this.client = client;
    this.workflowRunId = workflowRunId;
    this.logger = logger;
  }

  public put(stepExecutionId: string, value: JsonValue | null): void {
    this.client.put(stepExecutionId, this.workflowRunId, value);
  }

  public get(
    stepExecutionIds: readonly string[],
    workflowRunId: string
  ): Promise<Map<string, JsonValue | null>> {
    return this.client.get(stepExecutionIds, workflowRunId);
  }

  public async cleanup(workflowRunId: string): Promise<void> {
    try {
      await this.client.cleanup(workflowRunId);
    } catch (err) {
      this.logger.warn(
        `SQLite cache cleanup failed for run ${workflowRunId}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  public async dispose(): Promise<void> {
    // Worker is process-lifetime; shutdown is handled by plugin.stop() via SqliteCacheClient.shutdown()
  }
}
