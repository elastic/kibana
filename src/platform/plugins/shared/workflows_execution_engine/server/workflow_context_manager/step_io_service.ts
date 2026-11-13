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
 * Owns the read cache for step inputs and outputs and routes IO reads and
 * writes between the LRU and `WorkflowExecutionState`.
 *
 * `readBatch` is the only fetch. Inputs and outputs that fit stay in the LRU.
 * Values that do not exist only in the returned map. Flush is
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
   * Returns every requested value. Resident inputs and outputs come back with
   * no Elasticsearch call, from the LRU or execution state. Errors come from
   * the step execution. One `getStepExecutionsByIds` covers the misses. A
   * value evicted by a later insert in the same batch is still in the returned
   * map.
   */
  public async readBatch(
    ids: readonly string[],
    type: 'input' | 'output' | 'error'
  ): Promise<ReadonlyMap<string, StepIoBatchValue>> {
    const uniqueIds = this.uniqueIds(ids);
    if (type === 'error') {
      return this.readErrorBatch(uniqueIds);
    }
    return this.readValueBatch(uniqueIds, type);
  }

  // ----- IO writes ----------------------------------------------------------

  /**
   * Writes a step's input or output into execution state for the next flush
   * and into the LRU. A value the LRU refuses stays in state until that flush.
   */
  public write(
    stepExecutionId: string,
    type: 'input' | 'output',
    value: JsonValue | null,
    sizeBytes?: number
  ): void {
    this.state.setStepIo(stepExecutionId, { [type]: value });

    const measuredBytes =
      sizeBytes !== undefined && Number.isFinite(sizeBytes) && sizeBytes >= 0
        ? sizeBytes
        : undefined;
    this.cache.set(stepExecutionId, type, value, measuredBytes);
    if (type === 'output' && measuredBytes !== undefined) {
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

  /**
   * Reads inputs or outputs. The LRU answers first, then execution state, then
   * one Elasticsearch fetch. A fetched value that fits stays in the LRU.
   */
  private async readValueBatch(
    ids: readonly string[],
    type: 'input' | 'output'
  ): Promise<ReadonlyMap<string, JsonValue | null>> {
    const result = new Map<string, JsonValue | null>();
    const missing: string[] = [];
    for (const id of ids) {
      const cached = this.cache.get(id, type);
      if (cached !== undefined) {
        result.set(id, cached);
      } else {
        const live = this.state.getStepIo(id, type);
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
    const docs = await this.stepRepository.getStepExecutionsByIds(missing, ['id', type]);
    const fetched = new Map<string, JsonValue | null>();
    for (const doc of docs) {
      const alreadyWritten = this.state.getStepIo(doc.id, type) !== undefined;
      const alreadyCached = this.cache.has(doc.id, type);
      if (!alreadyWritten && !alreadyCached) {
        const value = doc[type] ?? null;
        const size = safeOutputSize(value) ?? undefined;
        if (type === 'output' && size !== undefined && !this.measuredSizes.has(doc.id)) {
          this.measuredSizes.set(doc.id, size);
          this.measuredTotalBytes += size;
        }
        this.cache.set(doc.id, type, value, size);
        fetched.set(doc.id, value);
      }
    }

    for (const id of ids) {
      const live = this.state.getStepIo(id, type);
      if (live !== undefined) {
        result.set(id, live);
      } else {
        const cached = this.cache.get(id, type);
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
