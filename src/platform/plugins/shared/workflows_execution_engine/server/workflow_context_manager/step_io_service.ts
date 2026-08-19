/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from '@kbn/utility-types';
import type { SerializedError } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';
import { extractReferencedStepIds } from './extract_referenced_step_ids';
import type { WorkflowExecutionState } from './workflow_execution_state';
import { WorkflowScopeStack } from './workflow_scope_stack';
import type { OutputSizeStats } from '../lib/telemetry/events/workflows_execution/types';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import { safeOutputSize } from '../step/errors';
import { buildStepExecutionId } from '../utils';
import { StepIoCache } from './step_io_cache';

export type { StepIoType } from './step_io_cache';

/** Resolves predecessors for a node. Supplied at call time so the service does not depend on `WorkflowGraph`. */
export type PredecessorsResolver = (node: GraphNodeUnion) => ReadonlyArray<GraphNodeUnion>;

export interface StepIoServiceInit {
  stepRepository: StepExecutionRepository;
  state: WorkflowExecutionState;
  /** Maximum total byte size for the output LRU cache. `Infinity` disables eviction entirely. */
  maxBytes?: number;
}

export interface PrepareForReadArgs {
  node: GraphNodeUnion;
  predecessorsResolver: PredecessorsResolver;
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
  prepareForRead(args: PrepareForReadArgs): Promise<void>;
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
 *   - `prepareForRead` — pre-warms the LRU from ES for cache misses
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

  constructor({ stepRepository, state, maxBytes = Infinity }: StepIoServiceInit) {
    this.stepRepository = stepRepository;
    this.state = state;
    this.cache = new StepIoCache(maxBytes);
  }

  // ----- IO reads -----------------------------------------------------------

  /**
   * Reads a step's input or output. For outputs: LRU hit first, then state
   * fallback. For inputs: state only (inputs are not cached in the LRU).
   *
   * Callers must ensure `prepareForRead` has run before reading outputs — the
   * pre-warm guarantee makes the state fallback a safety net rather than a
   * normal code path.
   */
  public read(
    stepExecutionId: string,
    type: 'input' | 'output'
  ): JsonValue | null | undefined {
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
   * Pre-warms the LRU with outputs the upcoming step will need synchronously.
   * Fetches cache misses from Elasticsearch. A no-op when `maxBytes` is
   * `Infinity` (eviction disabled) since all outputs are served from state.
   *
   * Must be called before the step's synchronous context build. Execution is
   * single-threaded, so once this async call resolves, no other writes will
   * happen before `read` is called — all pre-warmed entries are guaranteed to
   * be in the cache when they are needed.
   */
  public async prepareForRead({ node, predecessorsResolver }: PrepareForReadArgs): Promise<void> {
    if (this.cache.totalBytes === Infinity) return;

    const neededIds = this.computeRehydrationTargets(node, predecessorsResolver);

    const missing = [...neededIds].filter((id) => !this.cache.has(id, 'output'));
    if (missing.length === 0) return;

    const docs = await this.stepRepository.getStepExecutionsByIds(missing, ['id', 'output']);
    for (const doc of docs) {
      const bytes = safeOutputSize(doc.output) ?? 0;
      this.cache.set(doc.id, 'output', doc.output ?? null, bytes);
    }
  }

  // ----- Private helpers ----------------------------------------------------

  /**
   * Resolves the set of step execution IDs whose outputs need to be in the
   * cache before the upcoming context build. Combines:
   *
   * 1. Template-referenced steps (static analysis).
   * 2. Active scope-stack frames (uniform — no foreach/while-specific branches).
   *
   * Conservative fallback: when static analysis returns an empty set but a
   * predecessor is not in the cache, fall back to all predecessors to guard
   * against analysis gaps.
   */
  private computeRehydrationTargets(
    node: GraphNodeUnion,
    predecessorsResolver: PredecessorsResolver
  ): Set<string> {
    const neededIds = new Set<string>();
    const referencedStepIds = extractReferencedStepIds(node);

    const fallbackToPredecessors = (): void => {
      for (const pred of predecessorsResolver(node)) {
        const latestExec = this.state.getLatestStepExecution(pred.stepId);
        if (latestExec) {
          neededIds.add(latestExec.id);
        }
      }
    };

    if (referencedStepIds === null) {
      fallbackToPredecessors();
    } else {
      this.addLatestExecutionIdsForStepIds(neededIds, referencedStepIds);
      if (referencedStepIds.size === 0 && this.hasCacheMissPredecessor(node, predecessorsResolver)) {
        fallbackToPredecessors();
      }
    }

    // Scope-stack entries — needed by enrichStepContextAccordingToStepScope.
    // All scope types are treated uniformly (no foreach/while-specific input reads).
    const executionId = this.state.getWorkflowExecutionId();
    let currentScope = WorkflowScopeStack.fromStackFrames(
      this.state.getWorkflowExecutionScopeStack()
    );
    while (!currentScope.isEmpty()) {
      const frame = currentScope.getCurrentScope();
      currentScope = currentScope.exitScope();
      const scopeStepExecutionId = buildStepExecutionId(
        executionId,
        frame.stepId,
        currentScope.stackFrames
      );
      neededIds.add(scopeStepExecutionId);
    }

    return neededIds;
  }

  private addLatestExecutionIdsForStepIds(
    neededIds: Set<string>,
    referencedStepIds: ReadonlySet<string>
  ): void {
    for (const stepId of referencedStepIds) {
      const latestExec = this.state.getLatestStepExecution(stepId);
      if (latestExec) {
        neededIds.add(latestExec.id);
      }
    }
  }

  private hasCacheMissPredecessor(
    node: GraphNodeUnion,
    predecessorsResolver: PredecessorsResolver
  ): boolean {
    for (const pred of predecessorsResolver(node)) {
      const latestExec = this.state.getLatestStepExecution(pred.stepId);
      if (latestExec && !this.cache.has(latestExec.id, 'output')) {
        return true;
      }
    }
    return false;
  }

}
