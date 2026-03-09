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
import type { ConcurrencySemaphoreRepository } from '../repositories/concurrency_semaphore_repository';
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
 * The 'queue' strategy uses an atomic ES-backed semaphore to avoid the TOCTOU
 * race inherent in search-based concurrency checks (where ES NRT refresh lag
 * can allow more executions through than the configured max).
 */
export class ConcurrencyManager {
  private readonly templatingEngine: WorkflowTemplatingEngine;
  private readonly workflowTaskManager: WorkflowTaskManager;
  private readonly workflowExecutionRepository: WorkflowExecutionRepository;
  private readonly concurrencySemaphoreRepository: ConcurrencySemaphoreRepository;

  constructor(
    workflowTaskManager: WorkflowTaskManager,
    workflowExecutionRepository: WorkflowExecutionRepository,
    concurrencySemaphoreRepository: ConcurrencySemaphoreRepository
  ) {
    this.templatingEngine = new WorkflowTemplatingEngine();
    this.workflowTaskManager = workflowTaskManager;
    this.workflowExecutionRepository = workflowExecutionRepository;
    this.concurrencySemaphoreRepository = concurrencySemaphoreRepository;
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
    if (keyExpression === '') {
      return null;
    }
    if (!keyExpression.includes('{{') || !keyExpression.includes('}}')) {
      return keyExpression;
    }

    try {
      const evaluated = this.templatingEngine.evaluateExpression(
        keyExpression,
        context as Record<string, unknown>
      );

      if (evaluated === null || evaluated === undefined) {
        return keyExpression;
      }

      const result = String(evaluated).trim();

      if (result === '') {
        return null;
      }

      return result;
    } catch (error) {
      return keyExpression;
    }
  }

  /**
   * Checks concurrency limits and applies the collision strategy if needed.
   *
   * For 'queue' strategy:
   * - Uses an atomic semaphore to acquire a slot (no TOCTOU race)
   * - If no slot is available, queues the execution or skips if the queue is full
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

    // --- Queue strategy: atomic semaphore-based slot acquisition ---
    if (concurrencySettings.strategy === 'queue') {
      const acquired = await this.concurrencySemaphoreRepository.tryAcquireSlot(
        concurrencyGroupKey,
        spaceId,
        currentExecutionId,
        maxConcurrency
      );

      if (acquired) {
        return true;
      }

      // No slot available — check queue capacity before queuing
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

      await this.workflowExecutionRepository.updateWorkflowExecution({
        id: currentExecutionId,
        status: ExecutionStatus.QUEUED,
      });
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
