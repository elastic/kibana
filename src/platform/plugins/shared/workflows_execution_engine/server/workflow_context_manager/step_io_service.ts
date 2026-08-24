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
import type { SerializedError } from '@kbn/workflows';
import { StepIoCache } from './step_io_cache';
import type { WorkflowExecutionState } from './workflow_execution_state';
import type { OutputSizeStats } from '../lib/telemetry/events/workflows_execution/types';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import { safeOutputSize } from '../step/errors';

export type { StepIoType } from './step_io_cache';

export interface StepIoServiceInit {
  stepRepository: StepExecutionRepository;
  state: WorkflowExecutionState;
  /** Maximum total byte size for the output LRU cache. `Infinity` disables eviction entirely. */
  maxBytes?: number;
  logger?: Logger;
}

/**
 * Read-only IO surface used by node implementations and the context manager.
 */
export interface StepIoReader {
  read(stepExecutionId: string, type: 'input' | 'output'): JsonValue | null | undefined;
  getStepError(stepExecutionId: string): SerializedError | undefined;
  getLatestStepIO(stepId: string):
    | {
        input: JsonValue | undefined;
        output: JsonValue | null | undefined;
        error: SerializedError | undefined;
      }
    | undefined;
}

/**
 * Reader + write surface used by the per-step runtime.
 */
export interface StepIoWriter extends StepIoReader {
  write(
    stepExecutionId: string,
    type: 'input' | 'output',
    value: JsonValue | null,
    sizeBytes?: number
  ): void;
}

/**
 * Lifecycle surface used by the workflow execution loop and runtime manager only.
 */
export interface StepIoLifecycle {
  rehydrate(ids: ReadonlyArray<string>): Promise<void>;
  getOutputSizeStats(): OutputSizeStats;
}

/**
 * Owns the read cache for step outputs and routes IO reads/writes between
 * the LRU cache and `WorkflowExecutionState`.
 *
 * Responsibilities:
 *   - Output LRU cache (`StepIoCache` → `lru-cache`)
 *   - `write(id, type, value)` — routes outputs to both cache and state, inputs to state only
 *   - `read(id, type)` — LRU hit or state fallback
 *   - `rehydrate(ids)` — fetches cache-missing IDs from ES before context build
 *   - `getOutputSizeStats` — telemetry
 *
 * Flush, load, eviction, and pin machinery have all been removed. Flush is
 * `WorkflowExecutionState`'s responsibility. Load is `WorkflowExecutionState.load()`.
 * Eviction is handled by the LRU on insert.
 */
export class StepIoService implements StepIoWriter, StepIoLifecycle {
  private readonly stepRepository: StepExecutionRepository;
  private readonly state: WorkflowExecutionState;
  private readonly cache: StepIoCache;

  constructor({ stepRepository, state, maxBytes = Infinity, logger }: StepIoServiceInit) {
    this.stepRepository = stepRepository;
    this.state = state;
    this.cache = new StepIoCache(maxBytes, logger);
  }

  // ----- IO reads -----------------------------------------------------------

  /**
   * Reads a step's input or output. For outputs: LRU hit first, then state
   * fallback. For inputs: state only (inputs are not cached in the LRU).
   *
   * Callers must ensure `rehydrate` has run before reading outputs — the
   * pre-warm guarantee makes the state fallback a safety net rather than a
   * normal code path.
   */
  public read(stepExecutionId: string, type: 'input' | 'output'): JsonValue | null | undefined {
    const cached = this.cache.get(stepExecutionId, type);
    if (cached !== undefined) return cached;
    return this.state.getStepIo(stepExecutionId, type);
  }

  public getStepError(stepExecutionId: string): SerializedError | undefined {
    return this.state.getStepExecution(stepExecutionId)?.error;
  }

  public getLatestStepIO(stepId: string):
    | {
        input: JsonValue | undefined;
        output: JsonValue | null | undefined;
        error: SerializedError | undefined;
      }
    | undefined {
    const latest = this.state.getLatestStepExecution(stepId);
    if (!latest) return undefined;
    return {
      input: this.read(latest.id, 'input') ?? undefined,
      output: this.read(latest.id, 'output'),
      error: latest.error,
    };
  }

  // ----- IO writes ----------------------------------------------------------

  /**
   * Writes a step's input or output.
   *
   * - Both types are written to `WorkflowExecutionState` for persistence.
   * - Only `output` is written to the LRU cache. Inputs are served from state
   *   directly; extending to cache inputs requires removing the type guard here.
   */
  public write(
    stepExecutionId: string,
    type: 'input' | 'output',
    value: JsonValue | null,
    sizeBytes?: number
  ): void {
    this.state.setStepIo(stepExecutionId, { [type]: value });
    if (type === 'output') {
      this.cache.set(stepExecutionId, 'output', value, sizeBytes);
    }
  }

  // ----- Telemetry ----------------------------------------------------------

  public getOutputSizeStats(): OutputSizeStats {
    return {
      totalBytes: this.cache.totalBytes,
      stepCount: this.cache.size,
    };
  }

  // ----- Lifecycle ----------------------------------------------------------

  /**
   * Ensures the given step execution IDs are resident in the LRU cache,
   * fetching any cache misses from Elasticsearch. A no-op when `maxBytes` is
   * `Infinity` (eviction disabled) or when all IDs are already cached.
   *
   * Callers (WorkflowContextManager.ensureContextReady) are responsible for
   * resolving which IDs are needed before calling this method.
   */
  public async rehydrate(ids: ReadonlyArray<string>): Promise<void> {
    if (this.cache.totalBytes === Infinity) return;

    const missing = ids.filter((id) => !this.cache.has(id, 'output'));
    if (missing.length === 0) return;

    const docs = await this.stepRepository.getStepExecutionsByIds(missing, ['id', 'output']);
    for (const doc of docs) {
      const bytes = safeOutputSize(doc.output) ?? 0;
      this.cache.set(doc.id, 'output', doc.output ?? null, bytes);
    }
  }
}
