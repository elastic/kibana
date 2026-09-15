/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  EsWorkflowExecution,
  ParallelConcurrencyObject,
  StackFrame,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import {
  DEFAULT_PARALLEL_CONCURRENCY,
  DEFAULT_PARALLEL_MAX_CONCURRENCY,
  ExecutionStatus,
  pickManagedWorkflowFields,
  toWorkflowExecutionEngineModel,
} from '@kbn/workflows';
import type { EnterParallelNode } from '@kbn/workflows/graph';
import type { ParallelBranchState, ParallelStepState } from './types';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../types';
import { buildStepExecutionId } from '../../utils';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { RuntimeGraphView } from '../../workflow_context_manager/workflow_runtime_graph';
import { WorkflowScopeStack } from '../../workflow_context_manager/workflow_scope_stack';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';

export type ParallelMode = 'fail-fast' | 'settled';

const DEFAULT_PARALLEL_MODE: ParallelMode = 'fail-fast';

export const TERMINAL_BRANCH_STATUSES = new Set<ParallelBranchState['status']>([
  'completed',
  'failed',
  'skipped',
  'timed_out',
]);

export interface ParallelBranchCoordinatorDeps {
  enterNode: EnterParallelNode;
  workflowRuntime: WorkflowExecutionRuntimeManager;
  stepExecutionRuntime: StepExecutionRuntime;
  workflowLogger: IWorkflowEventLogger;
  workflowGraph: RuntimeGraphView;
  workflowExecutionRepository: WorkflowExecutionRepository;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  request: KibanaRequest;
  spaceId: string;
}

/**
 * The parallel step's branch bookkeeping, shared by its enter node (which fans
 * out) and its exit node (which joins).
 *
 * Both nodes resolve to the same step execution, so they see the same
 * `ParallelStepState`; this class owns every operation that reads or writes a
 * branch — deriving branch identity, launching branch executions, and reading
 * them back — so the two halves cannot drift apart on how a branch is addressed.
 */
export class ParallelBranchCoordinator {
  constructor(private readonly deps: ParallelBranchCoordinatorDeps) {}

  public get isStatic(): boolean {
    const { branches } = this.deps.enterNode;
    return Array.isArray(branches) && branches.length > 0;
  }

  public get mode(): ParallelMode {
    return (this.deps.enterNode.configuration.mode as ParallelMode | undefined) ?? DEFAULT_PARALLEL_MODE;
  }

  public get concurrency(): { max: number; countWaiting: boolean } {
    const { concurrency } = this.deps.enterNode.configuration;
    if (concurrency == null) {
      return { max: DEFAULT_PARALLEL_CONCURRENCY, countWaiting: true };
    }
    if (typeof concurrency === 'number') {
      return { max: clampConcurrency(concurrency), countWaiting: true };
    }
    const { max, 'count-waiting': countWaiting } = concurrency as ParallelConcurrencyObject;
    return {
      max: clampConcurrency(max ?? DEFAULT_PARALLEL_CONCURRENCY),
      countWaiting: countWaiting ?? true,
    };
  }

  /**
   * A branch's execution id, which is also its wrapper step execution id in the
   * parent. Derived from the branch's scope, so a fan-out that is retried after
   * a crash re-derives exactly the same ids and reuses the children it created.
   */
  public branchExecutionId(index: number): string {
    return buildStepExecutionId(
      this.deps.workflowRuntime.getWorkflowExecution().id,
      this.deps.enterNode.stepId,
      this.branchStackFrames(index)
    );
  }

  /** The parallel step's scope with this branch's frame pushed onto it. */
  public branchStackFrames(index: number): StackFrame[] {
    return WorkflowScopeStack.fromStackFrames(this.deps.workflowRuntime.getCurrentNodeScope()).enterScope(
      {
        nodeId: this.deps.enterNode.id,
        nodeType: this.deps.enterNode.type,
        stepId: this.deps.enterNode.stepId,
        scopeId: index.toString(),
      }
    ).stackFrames;
  }

  /**
   * Starts every branch that is eligible under the concurrency cap and, in
   * fail-fast mode, has not been short-circuited by an earlier failure.
   *
   * Mutates `state` in place; the caller persists it. Returns the branches that
   * were launched so the caller can log or react to an empty wave.
   */
  public async launchEligibleBranches(state: ParallelStepState): Promise<ParallelBranchState[]> {
    const { max, countWaiting } = this.concurrency;
    const failFast = this.mode === 'fail-fast';
    const hasFailure = state.branches.some(
      (branch) => branch.status === 'failed' || branch.status === 'timed_out'
    );

    // A branch holds a slot while it is running. With `count-waiting: false` a
    // branch parked on a wait releases its slot so a queued branch can start.
    const slotsInUse = () =>
      state.branches.filter((branch) => {
        if (branch.status !== 'running') return false;
        return countWaiting || !branch.waiting;
      }).length;

    const launched: ParallelBranchState[] = [];
    for (const branch of state.branches) {
      if (branch.status !== 'pending') continue;
      if (failFast && hasFailure) continue;
      if (slotsInUse() >= max) break;

      await this.launchBranch(branch, state.branches);
      launched.push(branch);
    }

    return launched;
  }

  /**
   * Creates (or re-attaches to) the child execution that runs one branch body.
   *
   * The child runs a slice of the parent's graph rather than the whole workflow.
   * It starts at its own root scope, so the branch's `{{ foreach.* }}` context is
   * injected instead of inherited, the way a single-step subgraph run does it.
   */
  private async launchBranch(
    branch: ParallelBranchState,
    allBranches: ParallelBranchState[]
  ): Promise<void> {
    const { enterNode, workflowRuntime, workflowLogger, workflowGraph } = this.deps;
    const parentExecution = workflowRuntime.getWorkflowExecution();
    const executionId = this.branchExecutionId(branch.index);
    const branchStackFrames = this.branchStackFrames(branch.index);

    // The wrapper step stands in for the branch inside the parent: it is what
    // the execution detail nests the child's steps under, and its id is the
    // child's execution id.
    workflowRuntime.upsertStepExecution({
      id: executionId,
      stepId: enterNode.stepId,
      stepType: enterNode.stepType,
      scopeStack: branchStackFrames,
      status: ExecutionStatus.RUNNING,
      startedAt: new Date().toISOString(),
      hasChildExecution: true,
      isBranchWrapper: true,
    });

    const executionGraph = workflowGraph
      .getNodeRangeGraph(
        this.branchStartNodeId(branch.index),
        enterNode.exitNodeId,
        this.branchTimeout
      )
      .toJSON();

    await this.deps.workflowsExecutionEngine.executeWorkflow(
      this.branchWorkflowModel(parentExecution),
      {
        ...parentExecution.context,
        contextOverride: {
          ...(parentExecution.context?.contextOverride as Record<string, unknown> | undefined),
          ...this.branchForeachContext(branch, allBranches),
        },
        spaceId: this.deps.spaceId,
        // `parentWorkflowInvocation: 'sync'` is what makes a terminal child
        // resume this parent, which is how the exit node learns a branch is
        // done. `parentDepth` is passed through unchanged rather than
        // incremented: a branch is a fragment of this workflow, not a nested
        // one, so it must not consume the `workflow.execute` depth budget.
        triggeredBy: 'workflow-step',
        parentWorkflowInvocation: 'sync',
        parentWorkflowId: parentExecution.workflowId,
        parentWorkflowExecutionId: parentExecution.id,
        parentStepId: enterNode.stepId,
      },
      this.deps.request,
      {
        executionId,
        executionGraph,
        parentExecutionId: parentExecution.id,
      }
    );

    branch.status = 'running';
    branch.executionId = executionId;
    branch.startedAt = Date.now();

    workflowLogger.logDebug(
      `Parallel step "${enterNode.stepId}" started branch ${branch.index} as execution ${executionId}.`,
      { workflow: { step_id: enterNode.stepId } }
    );
  }

  /** Reads every launched branch's child execution in one mget, keyed by execution id. */
  public async readBranchExecutions(
    state: ParallelStepState
  ): Promise<Map<string, EsWorkflowExecution>> {
    const executionIds = state.branches
      .map((branch) => branch.executionId)
      .filter((executionId): executionId is string => executionId !== undefined);

    const executions = await this.deps.workflowExecutionRepository.getWorkflowExecutionsByIds(
      executionIds,
      this.deps.spaceId
    );

    return new Map(executions.map((execution) => [execution.id, execution]));
  }

  /** Requests cancellation of every branch that has not reached a terminal status. */
  public async cancelRunningBranches(state: ParallelStepState): Promise<void> {
    const runningIds = state.branches
      .filter((branch) => !TERMINAL_BRANCH_STATUSES.has(branch.status) && branch.executionId)
      .map((branch) => branch.executionId as string);

    await Promise.all(
      runningIds.map((executionId) =>
        this.deps.workflowsExecutionEngine
          .cancelWorkflowExecution(executionId, this.deps.spaceId, this.deps.request)
          .catch((error: unknown) => {
            // Teardown of one branch must not block the others; cancel is idempotent.
            this.deps.workflowLogger.logWarn(
              `Parallel step "${this.deps.enterNode.stepId}" failed to cancel branch execution ${executionId}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          })
      )
    );
  }

  /**
   * The `{{ foreach.* }}` a dynamic branch would have seen inline. A branch child
   * starts at its own root scope, so the item it is processing has to be handed
   * to it rather than derived from an enclosing foreach frame.
   */
  private branchForeachContext(
    branch: ParallelBranchState,
    allBranches: ParallelBranchState[]
  ): { foreach?: { item: unknown; index: number; items: unknown[]; total: number } } {
    if (this.isStatic) {
      return {};
    }

    return {
      foreach: {
        item: branch.key,
        index: branch.index,
        items: allBranches.map(({ key }) => key),
        total: allBranches.length,
      },
    };
  }

  /** The first node of branch `index`'s body in the parent graph. */
  private branchStartNodeId(index: number): string {
    const { branches, branchStartNodeId, stepId } = this.deps.enterNode;
    const startNodeId = branches ? branches[index]?.startNodeId : branchStartNodeId;
    if (startNodeId === undefined) {
      throw new Error(`Parallel step "${stepId}" could not resolve a start node for branch ${index}.`);
    }
    return startNodeId;
  }

  /**
   * The deadline a branch execution enforces on itself. Prefers `branch-timeout`;
   * falls back to the step's overall `timeout` so a branch cannot outlive the
   * step even though the step's own timeout zone lives in the parent.
   *
   * A branch is always wrapped, even with nothing configured: the zone is also
   * what re-creates the enclosing workflow scope the inherited stack expects.
   */
  private get branchTimeout(): string {
    const { configuration } = this.deps.enterNode;
    return (
      configuration['branch-timeout'] ??
      configuration.timeout ??
      this.deps.workflowRuntime.getWorkflowExecution().workflowDefinition.settings?.timeout ??
      DEFAULT_BRANCH_TIMEOUT
    );
  }

  /**
   * The workflow a branch child runs. It is the same workflow as the parent —
   * only the graph differs, and that is supplied separately.
   */
  private branchWorkflowModel(parentExecution: EsWorkflowExecution): WorkflowExecutionEngineModel {
    return toWorkflowExecutionEngineModel(
      {
        id: parentExecution.workflowId,
        name: parentExecution.workflowDefinition.name,
        enabled: true,
        definition: parentExecution.workflowDefinition,
        yaml: parentExecution.yaml,
        version: parentExecution.version,
        ...pickManagedWorkflowFields(parentExecution),
      },
      { isTestRun: parentExecution.isTestRun, spaceId: parentExecution.spaceId }
    );
  }
}

// Only reached when neither the step nor the workflow sets a timeout; it bounds
// a branch that would otherwise have no deadline of its own.
export const DEFAULT_BRANCH_TIMEOUT = '1h';

// Defensive runtime clamp: schema validation already rejects values above the
// ceiling, but the engine must never let a malformed/legacy definition pin a
// worker with an unbounded lane count.
const clampConcurrency = (requested: number): number =>
  Math.min(Math.max(1, requested), DEFAULT_PARALLEL_MAX_CONCURRENCY);
