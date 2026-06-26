/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from '@kbn/utility-types';

/**
 * Read/write cache seam between the in-memory step IO map and Elasticsearch.
 *
 * `spills` — true when this tier performs off-heap spilling. StepIoService reads
 *   this flag to choose between two profiling modes:
 *   - false (NoopCacheTier / sqliteCache.enabled=false): hold all step IO in V8
 *     memory for the whole run; no eviction, no rehydration. Isolates heap pressure.
 *   - true  (SqliteCacheTier / sqliteCache.enabled=true): evict-to-SQLite after
 *     flush, fetch-on-miss from SQLite, ES cold-cache fallback (cross-node resume).
 *
 * `put` is fire-and-forget (void): within a single process the singleton worker's
 *   FIFO message queue guarantees that a `get` for the same id arriving after its
 *   `put` will see the written row.
 * `get` resolves to an empty Map on timeout or degraded state; callers fall back
 *   to the ES rehydration path for missing ids.
 * `cleanup` removes all rows for a completed workflow run. Failure is logged and
 *   never thrown — rows in tmpdir are disposable.
 * `dispose` is a no-op on SqliteCacheTier (worker is process-lifetime); kept on
 *   the interface for symmetry with NoopCacheTier and future use.
 */
export interface CacheTier {
  readonly spills: boolean;
  put(stepExecutionId: string, value: JsonValue | null): void;
  get(
    stepExecutionIds: readonly string[],
    workflowRunId: string
  ): Promise<Map<string, JsonValue | null>>;
  cleanup(workflowRunId: string): Promise<void>;
  dispose(): Promise<void>;
}

/**
 * Tier when sqliteCache.enabled=false. No spilling: outputs are held in the
 * V8 outputs map for the entire workflow run (no eviction, no rehydration).
 * Every method is a no-op; get() returns an empty Map. The worker is never spawned.
 */
export class NoopCacheTier implements CacheTier {
  public readonly spills = false as const;

  public put(_stepExecutionId: string, _value: JsonValue | null): void {}

  public async get(
    _stepExecutionIds: readonly string[],
    _workflowRunId: string
  ): Promise<Map<string, JsonValue | null>> {
    return new Map();
  }

  public async cleanup(_workflowRunId: string): Promise<void> {}

  public async dispose(): Promise<void> {}
}
