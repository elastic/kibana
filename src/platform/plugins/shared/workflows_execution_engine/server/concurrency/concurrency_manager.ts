/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConcurrencySettings, WorkflowContext } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { WorkflowTemplatingEngine } from '../templating_engine';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

/**
 * Manages concurrency control for workflow executions.
 *
 * Scope:
 * - Evaluating concurrency group keys from static strings or template expressions
 * - Enforcing concurrency limits per group
 * - Implementing collision strategies (drop, cancel-in-progress, queue)
 *
 * The 'queue' strategy always enqueues new executions and relies on the
 * plugin's promoteFromQueue() to atomically acquire semaphore slots and
 * schedule Task Manager tasks in FIFO order.
 */
export class ConcurrencyManager {
  private readonly templatingEngine: WorkflowTemplatingEngine;
  private readonly workflowTaskManager: WorkflowTaskManager;
  private readonly workflowExecutionRepository: WorkflowExecutionRepository;

  constructor(
    workflowTaskManager: WorkflowTaskManager,
    workflowExecutionRepository: WorkflowExecutionRepository
  ) {
    this.templatingEngine = new WorkflowTemplatingEngine();
    this.workflowTaskManager = workflowTaskManager;
    this.workflowExecutionRepository = workflowExecutionRepository;
  }

  /**
   * Evaluates a concurrency key from workflow settings and execution context.
   *
   * @param concurrencySettings - The concurrency settings from workflow definition
   * @param context - The workflow execution context for template evaluation
   * @returns The evaluated concurrency group key, or null if key is not set/empty.
   *          If template evaluation fails or returns null/undefined, returns the key as-is
   *          (treating it as a static string, as the user may have intended literal text).
   */
  public evaluateConcurrencyKey(
    concurrencySettings: ConcurrencySettings | undefined,
    context: WorkflowContext
  ): string | null {
    if (!concurrencySettings?.key) {
      return null;
    }

    const keyExpression = concurrencySettings.key.trim();

    try {
      const rendered = this.templatingEngine.render(
        keyExpression,
        context as Record<string, unknown>
      );

      if (rendered === '') {
        return null;
      }

      return rendered;
    } catch (error) {
      return keyExpression;
    }
  }

  /**
   * Checks concurrency limits and applies the collision strategy if needed.
   *
   * For 'queue' strategy:
   * - Always enqueues the new execution (FIFO fairness — older queued items run first)
   * - Skips if the queue is already at maxQueueSize
   * - Slot acquisition and promotion happen separately via promoteFromQueue()
   *
   * For 'drop' strategy:
   * - Queries for non-terminal executions with the same concurrency group key
   * - If limit is exceeded, marks the new execution as SKIPPED and returns false
   *
   * For 'cancel-in-progress' strategy:
   * - Queries for non-terminal executions with the same concurrency group key
   * - If limit is exceeded, cancels the oldest execution(s) to make room
   *
   * @param concurrencySettings - The concurrency settings from workflow definition
   * @param concurrencyGroupKey - The evaluated concurrency group key
   * @param currentExecutionId - The ID of the current execution to check
   * @param spaceId - The space ID of the execution
   * @returns Promise<boolean> - true if execution can proceed, false otherwise
   */
  public async checkConcurrency(
    concurrencySettings: ConcurrencySettings | undefined,
    concurrencyGroupKey: string | null,
    currentExecutionId: string,
    spaceId: string
  ): Promise<boolean> {
    if (!concurrencySettings || !concurrencyGroupKey) {
      return true;
    }

    const maxConcurrency = concurrencySettings.max ?? 1;

    // --- Queue strategy: always enqueue, promote separately ---
    // New executions always join the back of the queue to guarantee FIFO
    // ordering. Slot acquisition happens in promoteFromQueue(), which the
    // caller invokes after this method returns false. This prevents a new
    // trigger from jumping ahead of older queued executions.
    if (concurrencySettings.strategy === 'queue') {
      const maxQueueSize = concurrencySettings.maxQueueSize;
      const queued = await this.workflowExecutionRepository.getQueuedExecutionsByConcurrencyGroup(
        concurrencyGroupKey,
        spaceId
      );

      if (queued.length >= maxQueueSize) {
        await this.workflowExecutionRepository.updateWorkflowExecution({
          id: currentExecutionId,
          status: ExecutionStatus.SKIPPED,
          cancelRequested: true,
          cancellationReason: `Queue full (maxQueueSize: ${maxQueueSize})`,
          cancelledAt: new Date().toISOString(),
          cancelledBy: 'system',
        });
        return false;
      }

      // Use refresh: 'wait_for' so the QUEUED document is immediately visible
      // to the promoteFromQueue() search that the caller runs right after this
      // returns false. Without it, NRT lag (~1s) can hide the just-written doc
      // and leave the execution stuck in QUEUED when slots are actually free.
      await this.workflowExecutionRepository.updateWorkflowExecution(
        { id: currentExecutionId, status: ExecutionStatus.QUEUED },
        { refresh: 'wait_for' }
      );
      return false;
    }

    // --- Drop and cancel-in-progress: search-based (unchanged) ---
    const runningExecutionIds =
      await this.workflowExecutionRepository.getRunningExecutionsByConcurrencyGroup(
        concurrencyGroupKey,
        spaceId,
        currentExecutionId
      );

    const activeCount = runningExecutionIds.length;

    if (activeCount < maxConcurrency) {
      return true;
    }

    if (concurrencySettings.strategy === 'drop') {
      const skipTimestamp = new Date().toISOString();
      await this.workflowExecutionRepository.updateWorkflowExecution({
        id: currentExecutionId,
        status: ExecutionStatus.SKIPPED,
        cancelRequested: true,
        cancellationReason: `Dropped due to concurrency limit (max: ${maxConcurrency})`,
        cancelledAt: skipTimestamp,
        cancelledBy: 'system',
      });
      return false;
    }

    if (concurrencySettings.strategy === 'cancel-in-progress') {
      const executionsToCancel = activeCount - maxConcurrency + 1;
      const executionIdsToCancel = runningExecutionIds.slice(0, executionsToCancel);

      const cancellationTimestamp = new Date().toISOString();
      await this.workflowExecutionRepository.bulkUpdateWorkflowExecutions(
        executionIdsToCancel.map((id) => ({
          id,
          status: ExecutionStatus.CANCELLED,
          cancelRequested: true,
          cancellationReason: `Cancelled due to concurrency limit (max: ${maxConcurrency})`,
          cancelledAt: cancellationTimestamp,
          cancelledBy: 'system',
        }))
      );

      await Promise.all(
        executionIdsToCancel.map((id) => this.workflowTaskManager.forceRunIdleTasks(id))
      );

      return true;
    }

    return true;
  }
}
