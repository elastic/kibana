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

/** Slot-holders plus the queued backlog, oldest first, so one snapshot can rank a new run. */
const QUEUE_ADMISSION_STATUSES: readonly ExecutionStatus[] = [
  ...ConcurrencySlotOccupyingExecutionStatuses,
  ExecutionStatus.QUEUED,
];

/**
 * Rank of `currentExecutionId` in an oldest-first id list.
 * A missing id is treated as newest so a run that cannot see itself does not take an older slot.
 */
const placeInAdmissionOrder = (
  orderedIds: readonly string[],
  currentExecutionId: string
): { rank: number; olderIds: string[]; newerCount: number } => {
  const selfIndex = orderedIds.indexOf(currentExecutionId);
  if (selfIndex === -1) {
    return { rank: orderedIds.length, olderIds: [...orderedIds], newerCount: 0 };
  }
  return {
    rank: selfIndex,
    olderIds: orderedIds.slice(0, selfIndex),
    newerCount: orderedIds.length - selfIndex - 1,
  };
};

/**
 * Manages concurrency control for workflow executions.
 *
 * Scope:
 * - Evaluating concurrency group keys from static strings or template expressions
 * - Enforcing concurrency limits per group
 * - Implementing collision strategies (drop, cancel-in-progress, queue)
 */
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
   * Admission uses one oldest-first snapshot that includes this run. Rank is the number of
   * executions before this one. Each run writes only its own status, except cancel-in-progress
   * winners, which still cancel older runs that no longer fit.
   *
   * For 'cancel-in-progress':
   * - The newest `max` runs proceed. A run with `max` or more newer peers cancels itself.
   * - A winner cancels the oldest runs that do not fit in the remaining slots.
   *
   * For 'drop':
   * - Rank below `max` proceeds. A later rank is SKIPPED, even when newer peers are also pending.
   *
   * For `queue`:
   * - The snapshot includes slot-holders and the `queued` backlog.
   * - Rank below `max` proceeds. The next `queue-size` ranks are `queued`. The rest are SKIPPED.
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
    // If no concurrency settings or key, allow execution to proceed
    if (!concurrencySettings || !concurrencyGroupKey) {
      return true;
    }

    const strategy = concurrencySettings.strategy;
    const maxConcurrency = concurrencySettings.max ?? 1;

    if (strategy === 'queue') {
      const orderedIds = await this.listAdmissionIds(
        concurrencyGroupKey,
        spaceId,
        QUEUE_ADMISSION_STATUSES
      );
      const { rank } = placeInAdmissionOrder(orderedIds, currentExecutionId);
      if (rank < maxConcurrency) {
        return true;
      }

      const queueMax = concurrencySettings['queue-size'] ?? DEFAULT_CONCURRENCY_QUEUE_SIZE;
      if (rank < maxConcurrency + queueMax) {
        await this.workflowExecutionRepository.updateWorkflowExecution(
          {
            id: currentExecutionId,
            status: ExecutionStatus.QUEUED,
          },
          { refresh: 'wait_for' }
        );
        return false;
      }

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

    const orderedIds = await this.listAdmissionIds(
      concurrencyGroupKey,
      spaceId,
      ConcurrencySlotOccupyingExecutionStatuses
    );
    const { rank, olderIds, newerCount } = placeInAdmissionOrder(orderedIds, currentExecutionId);

    // Drop ignores newer pending peers. Counting them would skip every simultaneous run.
    if (strategy === 'drop') {
      if (rank < maxConcurrency) {
        return true;
      }
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

    const activeCount = olderIds.length + newerCount;
    if (activeCount < maxConcurrency) {
      return true;
    }

    if (strategy === 'cancel-in-progress') {
      // A newer run owns the slot. Cancelling peers here would cancel that newer run too.
      if (newerCount >= maxConcurrency) {
        const cancellationTimestamp = new Date().toISOString();
        await this.workflowExecutionRepository.updateWorkflowExecution({
          id: currentExecutionId,
          status: ExecutionStatus.CANCELLED,
          cancelRequested: true,
          cancellationReason: `Cancelled due to concurrency limit (max: ${maxConcurrency})`,
          cancelledAt: cancellationTimestamp,
          cancelledBy: 'system',
        });
        return false;
      }

      const slotsForOlder = maxConcurrency - newerCount - 1;
      const executionIdsToCancel = olderIds.slice(0, olderIds.length - slotsForOlder);
      if (executionIdsToCancel.length === 0) {
        return true;
      }

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

  private listAdmissionIds(
    concurrencyGroupKey: string,
    spaceId: string,
    statuses: readonly ExecutionStatus[]
  ): Promise<string[]> {
    return this.workflowExecutionRepository.getRunningExecutionsByConcurrencyGroup(
      concurrencyGroupKey,
      spaceId,
      undefined,
      undefined,
      statuses
    );
  }
}
