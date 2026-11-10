/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConcurrencySettings, LiquidSettings, WorkflowContext } from '@kbn/workflows';
import {
  ConcurrencySlotOccupyingExecutionStatuses,
  DEFAULT_CONCURRENCY_QUEUE_SIZE,
  ExecutionStatus,
} from '@kbn/workflows';
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
 */
/** Whether the holder was created before the current execution, by `createdAt` then `id`, the order the repository sorts in. */
const isOlder = (
  holder: { createdAt: string; id: string },
  currentExecutionId: string,
  currentExecutionCreatedAt: string | undefined
): boolean => {
  // Without a timestamp to order by, every other execution counts as older.
  if (!currentExecutionCreatedAt) {
    return true;
  }
  const holderTime = Date.parse(holder.createdAt);
  const currentTime = Date.parse(currentExecutionCreatedAt);
  if (Number.isNaN(holderTime) || Number.isNaN(currentTime)) {
    return holder.createdAt < currentExecutionCreatedAt;
  }
  return holderTime < currentTime || (holderTime === currentTime && holder.id < currentExecutionId);
};

export class ConcurrencyManager {
  private readonly workflowTaskManager: WorkflowTaskManager;
  private readonly workflowExecutionRepository: WorkflowExecutionRepository;

  constructor(
    workflowTaskManager: WorkflowTaskManager,
    workflowExecutionRepository: WorkflowExecutionRepository
  ) {
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
    context: WorkflowContext,
    liquidSettings?: LiquidSettings
  ): string | null {
    if (!concurrencySettings?.key) {
      return null;
    }

    const keyExpression = concurrencySettings.key.trim();

    try {
      const templatingEngine = new WorkflowTemplatingEngine({ liquidSettings });
      const rendered = templatingEngine.render(keyExpression, context as Record<string, unknown>);

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
   * For 'cancel-in-progress' strategy:
   * - Queries slot-occupying executions with the same concurrency group key (excludes backlog `queued`)
   * - The newest executions win: given the current execution's `createdAt`, it cancels itself when at
   *   least `max` newer executions already hold slots, and otherwise cancels only older executions.
   *   Executions that arrive together then leave the newest running, whatever order they are checked in,
   *   instead of cancelling each other. Without `createdAt`, every other execution counts as older.
   * - Returns true if the new execution can proceed, false otherwise
   *
   * For 'drop' strategy:
   * - Same slot count as cancel-in-progress; if limit exceeded, SKIPPED new execution (false).
   *
   * For `queue`:
   * - If concurrency slots below max → proceed.
   * - Else enqueues newest as `queued` unless queue depth exceeds `queue-size`
   *   (`DEFAULT_CONCURRENCY_QUEUE_SIZE` when omitted), then SKIPPED explicitly.
   *
   * @param concurrencySettings - The concurrency settings from workflow definition
   * @param concurrencyGroupKey - The evaluated concurrency group key
   * @param currentExecutionId - The ID of the current execution to check
   * @param spaceId - The space ID of the execution
   * @param currentExecutionCreatedAt - When the current execution was created; orders it among the others
   * @returns Promise<boolean> - true if execution can proceed, false otherwise
   */
  public async checkConcurrency(
    concurrencySettings: ConcurrencySettings | undefined,
    concurrencyGroupKey: string | null,
    currentExecutionId: string,
    spaceId: string,
    currentExecutionCreatedAt?: string
  ): Promise<boolean> {
    // If no concurrency settings or key, allow execution to proceed
    if (!concurrencySettings || !concurrencyGroupKey) {
      return true;
    }

    const strategy = concurrencySettings.strategy;
    const maxConcurrency = concurrencySettings.max ?? 1;

    if (strategy === 'queue') {
      const othersOccupyingSlots =
        await this.workflowExecutionRepository.countExecutionsByConcurrencyGroupAndStatuses(
          concurrencyGroupKey,
          spaceId,
          ConcurrencySlotOccupyingExecutionStatuses,
          currentExecutionId
        );

      if (othersOccupyingSlots < maxConcurrency) {
        return true;
      }

      const queuedCount =
        await this.workflowExecutionRepository.countExecutionsByConcurrencyGroupAndStatuses(
          concurrencyGroupKey,
          spaceId,
          [ExecutionStatus.QUEUED]
        );

      const queueMax = concurrencySettings['queue-size'] ?? DEFAULT_CONCURRENCY_QUEUE_SIZE;

      if (queuedCount >= queueMax) {
        const skipTimestamp = new Date().toISOString();
        await this.workflowExecutionRepository.updateWorkflowExecution({
          id: currentExecutionId,
          status: ExecutionStatus.SKIPPED,
          cancelRequested: true,
          cancellationReason: `Queue full (queue-size: ${queueMax})`,
          cancelledAt: skipTimestamp,
          cancelledBy: 'system',
        });
        return false;
      }

      await this.workflowExecutionRepository.updateWorkflowExecution(
        {
          id: currentExecutionId,
          status: ExecutionStatus.QUEUED,
        },
        { refresh: 'wait_for' }
      );
      return false;
    }

    // Slot-occupying executions (excludes concurrency backlog `queued`), read once: every count below is
    // taken from this one snapshot, so they can't disagree about who holds a slot.
    const slotHolders = await this.workflowExecutionRepository.getRunningExecutionSlotHolders(
      concurrencyGroupKey,
      spaceId,
      currentExecutionId
    );

    const activeCount = slotHolders.length;

    // If we're within the limit, allow execution to proceed
    if (activeCount < maxConcurrency) {
      return true;
    }

    // Handle 'drop' strategy: mark new execution as SKIPPED if limit is exceeded
    if (strategy === 'drop') {
      const skipTimestamp = new Date().toISOString();
      await this.workflowExecutionRepository.updateWorkflowExecution({
        id: currentExecutionId,
        status: ExecutionStatus.SKIPPED,
        cancelRequested: true,
        cancellationReason: `Dropped due to concurrency limit (max: ${maxConcurrency})`,
        cancelledAt: skipTimestamp,
        cancelledBy: 'system',
      });
      return false; // Drop the new execution
    }

    // Handle 'cancel-in-progress' strategy: the newest executions keep the slots
    if (strategy === 'cancel-in-progress') {
      const olderExecutionIds = slotHolders
        .filter(({ createdAt, id }) =>
          isOlder({ createdAt, id }, currentExecutionId, currentExecutionCreatedAt)
        )
        .map(({ id }) => id);
      const newerCount = activeCount - olderExecutionIds.length;

      // Newer executions already hold every slot: this one is the one superseded.
      if (newerCount >= maxConcurrency) {
        await this.workflowExecutionRepository.updateWorkflowExecution({
          id: currentExecutionId,
          status: ExecutionStatus.CANCELLED,
          cancelRequested: true,
          cancellationReason: `Cancelled due to concurrency limit (max: ${maxConcurrency}): superseded by a newer execution`,
          cancelledAt: new Date().toISOString(),
          cancelledBy: 'system',
        });
        return false;
      }

      // Cancel the oldest executions, never a newer one (sorted by createdAt ascending)
      const executionsToCancel = activeCount - maxConcurrency + 1;
      const executionIdsToCancel = olderExecutionIds.slice(0, executionsToCancel);

      // Bulk update all executions to cancelled status in a single ES request
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

      // Propagate cancellation to running tasks (can be done in parallel)
      await Promise.all(
        executionIdsToCancel.map((id) => this.workflowTaskManager.forceRunIdleTasks(id))
      );

      return true; // Execution can proceed after cancelling old ones
    }

    return true;
  }
}
