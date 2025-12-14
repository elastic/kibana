/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, WorkflowContext } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowSettings } from '@kbn/workflows/spec/schema';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { WorkflowTemplatingEngine } from '../templating_engine';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

export type CollisionStrategy = 'queue' | 'drop' | 'cancel-in-progress';

export interface ConcurrencyCheckResult {
  shouldProceed: boolean;
  reason?: string;
  cancelledExecutionIds?: string[];
}

export class ConcurrencyManager {
  constructor(
    private readonly logger: Logger,
    private readonly workflowExecutionRepository: WorkflowExecutionRepository,
    private readonly workflowTaskManager: WorkflowTaskManager
  ) {}

  /**
   * Evaluates the concurrency key expression from workflow settings using the execution context.
   * Returns the evaluated key as a string, or null if no concurrency key is configured.
   * Supports both static strings and template expressions (e.g., {{ event.host.name }}).
   */
  evaluateConcurrencyKey(
    settings: WorkflowSettings | undefined,
    context: WorkflowContext
  ): string | null {
    if (!settings?.concurrency_key) {
      return null;
    }

    const keyExpression = settings.concurrency_key.trim();

    // If it's a static string (no template markers), return as-is
    if (!keyExpression.includes('{{')) {
      return keyExpression;
    }

    // Otherwise, evaluate as template expression
    try {
      const templateEngine = new WorkflowTemplatingEngine();
      const evaluated = templateEngine.evaluateExpression(keyExpression, context);

      // Convert to string for consistent grouping
      if (evaluated === null || evaluated === undefined) {
        this.logger.warn(`Concurrency key evaluated to null/undefined: ${keyExpression}`);
        return null;
      }

      return String(evaluated);
    } catch (error) {
      this.logger.error(`Failed to evaluate concurrency key "${keyExpression}": ${error}`);
      return null;
    }
  }

  /**
   * Checks for concurrency collisions and handles them according to the collision strategy.
   * Returns whether the execution should proceed.
   */
  async checkConcurrency(
    workflowId: string,
    spaceId: string,
    concurrencyGroupKey: string | null,
    settings: WorkflowSettings | undefined,
    currentExecutionId: string
  ): Promise<ConcurrencyCheckResult> {
    // If no concurrency key, proceed without checks
    if (!concurrencyGroupKey) {
      return { shouldProceed: true };
    }

    const maxConcurrency = settings.max_concurrency_per_group ?? 1;
    const collisionStrategy = (settings.collision_strategy ?? 'queue') as CollisionStrategy;

    // Find running executions with the same concurrency group
    const runningExecutions = await this.getRunningExecutionsByConcurrencyGroup(
      workflowId,
      spaceId,
      concurrencyGroupKey,
      currentExecutionId
    );

    const activeCount = runningExecutions.length;
    this.logger.debug(
      `Concurrency check for group "${concurrencyGroupKey}": Found ${activeCount} active execution(s) (limit: ${maxConcurrency})`
    );
    if (activeCount > 0) {
      this.logger.debug(
        `Active execution IDs: ${runningExecutions.map((e) => `${e.id}(${e.status})`).join(', ')}`
      );
    }

    // If under the limit, proceed
    if (activeCount < maxConcurrency) {
      return { shouldProceed: true };
    }

    // Collision detected - handle according to strategy
    this.logger.debug(
      `Concurrency collision detected for group "${concurrencyGroupKey}": ${activeCount} active executions (limit: ${maxConcurrency})`
    );

    switch (collisionStrategy) {
      case 'drop':
        return {
          shouldProceed: false,
          reason: `Skipped due to concurrency limit. Group "${concurrencyGroupKey}" has ${activeCount} active executions (limit: ${maxConcurrency})`,
        };

      case 'cancel-in-progress':
        // Cancel enough running executions to make room for the new one
        // We need to cancel (activeCount - maxConcurrency + 1) executions
        // Example: if maxConcurrency=2, activeCount=2, we cancel 1 to make room (2-2+1=1)
        const executionsToCancel = activeCount - maxConcurrency + 1;
        const cancelledIds: string[] = [];

        // Sort by startedAt to cancel oldest first (most fair)
        const sortedExecutions = [...runningExecutions].sort((a, b) => {
          const aTime = new Date(a.startedAt || a.createdAt).getTime();
          const bTime = new Date(b.startedAt || b.createdAt).getTime();
          return aTime - bTime;
        });

        for (let i = 0; i < executionsToCancel && i < sortedExecutions.length; i++) {
          const execution = sortedExecutions[i];
          try {
            // Mark as cancelled immediately - this will be picked up by the monitoring loop
            await this.workflowExecutionRepository.updateWorkflowExecution({
              id: execution.id,
              cancelRequested: true,
              status: ExecutionStatus.CANCELLED,
              cancellationReason:
                'Cancelled due to concurrency collision (cancel-in-progress strategy)',
              cancelledAt: new Date().toISOString(),
              cancelledBy: 'system',
            });
            // Force run idle tasks to wake up monitoring loop if task is idle
            await this.workflowTaskManager.forceRunIdleTasks(execution.id);
            cancelledIds.push(execution.id);
          } catch (error) {
            this.logger.error(`Failed to cancel execution ${execution.id}: ${error}`);
          }
        }
        return {
          shouldProceed: true,
          cancelledExecutionIds: cancelledIds,
        };

      case 'queue':
      default:
        // Queue: execution will remain in PENDING status until a slot opens
        // The execution loop will check periodically and start when available
        return {
          shouldProceed: false,
          reason: `Queued due to concurrency limit. Group "${concurrencyGroupKey}" has ${activeCount} active executions (limit: ${maxConcurrency})`,
        };
    }
  }

  /**
   * Gets running executions for a specific concurrency group.
   */
  private async getRunningExecutionsByConcurrencyGroup(
    workflowId: string,
    spaceId: string,
    concurrencyGroupKey: string,
    excludeExecutionId: string
  ): Promise<EsWorkflowExecution[]> {
    const mustClauses: Array<Record<string, unknown>> = [
      { term: { workflowId } },
      { term: { spaceId } },
      { term: { concurrencyGroupKey } },
    ];

    const mustNotClauses: Array<Record<string, unknown>> = [
      { term: { id: excludeExecutionId } },
      {
        terms: {
          status: [
            ExecutionStatus.COMPLETED,
            ExecutionStatus.FAILED,
            ExecutionStatus.CANCELLED,
            ExecutionStatus.SKIPPED,
            ExecutionStatus.TIMED_OUT,
          ],
        },
      },
    ];

    const hits = await this.workflowExecutionRepository.searchWorkflowExecutions(
      {
        bool: {
          must: mustClauses,
          must_not: mustNotClauses,
        },
      },
      100 // Get up to 100 to check concurrency
    );

    return (hits || []).map((hit) => hit._source as EsWorkflowExecution);
  }
}
