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

export type StepIoBatchValue = JsonValue | SerializedError | null;

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
  readBatch(
    ids: readonly string[],
    type: 'input' | 'output' | 'error'
  ): Promise<ReadonlyMap<string, StepIoBatchValue>>;
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
  getOutputSizeStats(): OutputSizeStats;
}

/**
 * Owns the read cache for step outputs and routes IO reads/writes between
 * the LRU cache and `WorkflowExecutionState`.
 *
 * `readBatch` is the only fetch. Outputs that fit stay in the LRU. Outputs
 * that do not exist only in the returned map. Flush is
 * `WorkflowExecutionState`'s responsibility.
 */
export class StepIoService implements StepIoWriter, StepIoLifecycle {
  private readonly stepRepository: StepExecutionRepository;
  private readonly state: WorkflowExecutionState;
  private readonly cache: StepIoCache;
  /** Execution-wide sizes of outputs written with a measured byte count, for telemetry. */
  private readonly measuredSizes = new Map<string, number>();
  private measuredTotalBytes = 0;

  constructor({ stepRepository, state, maxBytes = Infinity, logger }: StepIoServiceInit) {
    this.stepRepository = stepRepository;
    this.state = state;
    this.cache = new StepIoCache(maxBytes, logger);
  }

  /**
   * Returns every requested value. Resident values come back with no
   * Elasticsearch call: outputs from the LRU or execution state, inputs from
   * state, errors from the step execution. One `getStepExecutionsByIds` covers
   * the misses. A value evicted by a later insert in the same batch is still
   * in the returned map.
   */
  public async readBatch(
    ids: readonly string[],
    type: 'input' | 'output' | 'error'
  ): Promise<ReadonlyMap<string, StepIoBatchValue>> {
    const uniqueIds = this.uniqueIds(ids);
    if (type === 'error') {
      return this.readErrorBatch(uniqueIds);
    }
    if (type === 'input') {
      return this.readInputBatch(uniqueIds);
    }
    return this.readOutputBatch(uniqueIds);
  }

  // ----- IO writes ----------------------------------------------------------

  /**
   * Writes a step's input or output.
   *
   * - Both types are written to `WorkflowExecutionState` for persistence.
   * - Only `output` is written to the LRU cache. Inputs are served from state.
   */
  public write(
    stepExecutionId: string,
    type: 'input' | 'output',
    value: JsonValue | null,
    sizeBytes?: number
  ): void {
    this.state.setStepIo(stepExecutionId, { [type]: value });
    if (type === 'input') {
      return;
    }

    const measuredBytes =
      sizeBytes !== undefined && Number.isFinite(sizeBytes) && sizeBytes >= 0
        ? sizeBytes
        : undefined;
    this.cache.set(stepExecutionId, 'output', value, measuredBytes);
    if (measuredBytes !== undefined) {
      this.measuredTotalBytes += measuredBytes - (this.measuredSizes.get(stepExecutionId) ?? 0);
      this.measuredSizes.set(stepExecutionId, measuredBytes);
    }
  }

  // ----- Telemetry ----------------------------------------------------------

  public getOutputSizeStats(): OutputSizeStats {
    return {
      totalBytes: this.measuredTotalBytes,
      stepCount: this.measuredSizes.size,
    };
  }

  private uniqueIds(ids: readonly string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        unique.push(id);
      }
    }
    return unique;
  }

  private async readOutputBatch(
    ids: readonly string[]
  ): Promise<ReadonlyMap<string, JsonValue | null>> {
    const result = new Map<string, JsonValue | null>();
    const missing: string[] = [];
    for (const id of ids) {
      const cached = this.cache.get(id, 'output');
      if (cached !== undefined) {
        result.set(id, cached);
      } else {
        const live = this.state.getStepIo(id, 'output');
        if (live !== undefined) {
          result.set(id, live);
        } else {
          missing.push(id);
        }
      }
    }
    if (missing.length === 0) {
      return result;
    }

    // Values already in the map stay there even if this fetch evicts them.
    const captured = new Map(result);
    const docs = await this.stepRepository.getStepExecutionsByIds(missing, ['id', 'output']);
    const fetched = new Map<string, JsonValue | null>();
    for (const doc of docs) {
      const outputAlreadyWritten = this.state.getStepIo(doc.id, 'output') !== undefined;
      const alreadyCached = this.cache.has(doc.id, 'output');
      if (!outputAlreadyWritten && !alreadyCached) {
        const output = doc.output ?? null;
        const size = safeOutputSize(output) ?? undefined;
        if (size !== undefined && !this.measuredSizes.has(doc.id)) {
          this.measuredSizes.set(doc.id, size);
          this.measuredTotalBytes += size;
        }
        this.cache.set(doc.id, 'output', output, size);
        fetched.set(doc.id, output);
      }
    }

    for (const id of ids) {
      const live = this.state.getStepIo(id, 'output');
      if (live !== undefined) {
        result.set(id, live);
      } else {
        const cached = this.cache.get(id, 'output');
        if (cached !== undefined) {
          result.set(id, cached);
        } else if (fetched.has(id)) {
          result.set(id, fetched.get(id) ?? null);
        } else if (captured.has(id)) {
          result.set(id, captured.get(id) ?? null);
        }
      }
    }
    return result;
  }

  /** Fetches inputs that state dropped after flush (finished steps). */
  private async readInputBatch(
    ids: readonly string[]
  ): Promise<ReadonlyMap<string, JsonValue | null>> {
    const result = new Map<string, JsonValue | null>();
    const missing: string[] = [];
    for (const id of ids) {
      const live = this.state.getStepIo(id, 'input');
      if (live !== undefined) {
        result.set(id, live);
      } else if (this.state.getStepExecution(id) !== undefined && this.state.isInputEvicted(id)) {
        missing.push(id);
      }
    }
    if (missing.length === 0) {
      return result;
    }

    const docs = await this.stepRepository.getStepExecutionsByIds(missing, ['id', 'input']);
    const found = new Map(docs.map((doc) => [doc.id, doc.input ?? null]));
    for (const id of missing) {
      const live = this.state.getStepIo(id, 'input');
      result.set(id, live !== undefined ? live : found.get(id) ?? null);
    }
    return result;
  }

  /**
   * Errors live on the step execution. A loaded execution answers from memory.
   * Executions that are not loaded are fetched once.
   */
  private async readErrorBatch(
    ids: readonly string[]
  ): Promise<ReadonlyMap<string, SerializedError | null>> {
    const result = new Map<string, SerializedError | null>();
    const missing: string[] = [];
    for (const id of ids) {
      const execution = this.state.getStepExecution(id);
      if (execution) {
        result.set(id, execution.error ?? null);
      } else {
        missing.push(id);
      }
    }
    if (missing.length === 0) {
      return result;
    }

    const docs = await this.stepRepository.getStepExecutionsByIds(missing, ['id', 'error']);
    for (const doc of docs) {
      const execution = this.state.getStepExecution(doc.id);
      result.set(doc.id, execution?.error ?? doc.error ?? null);
    }
    return result;
  }
}
