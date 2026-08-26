/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { ConcurrencySettings, EsWorkflowExecution } from '@kbn/workflows';
import {
  ConcurrencySlotOccupyingExecutionStatuses,
  ExecutionStatus,
  isTerminalStatus,
} from '@kbn/workflows';

import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

/** Covers the narrow window where QUEUED is visible before the dormant task exists. */
const PROMOTE_QUEUED_RUN_RETRY_DELAY_MS = 250;
const PROMOTE_QUEUED_RUN_MAX_ATTEMPTS = 4;

const promoteQueuedRunTaskWithRetry = async (
  workflowTaskManager: WorkflowTaskManager,
  params: { executionId: string; triggeredBy: string }
): Promise<void> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < PROMOTE_QUEUED_RUN_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, PROMOTE_QUEUED_RUN_RETRY_DELAY_MS));
    }
    try {
      await workflowTaskManager.promoteQueuedRunTask(params);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

/**
 * Moves oldest `queued` executions to `pending` and promotes their pre-scheduled
 * `workflow:run` tasks via `runSoon` while slot occupancy is below `concurrency.max`.
 */
export async function drainConcurrencyQueueSlots(params: {
  workflowExecutionRepository: WorkflowExecutionRepository;
  workflowTaskManager: WorkflowTaskManager;
  logger: Logger;
  spaceId: string;
  concurrencyGroupKey: string;
  concurrencySettings: ConcurrencySettings;
}): Promise<void> {
  const {
    workflowExecutionRepository,
    workflowTaskManager,
    logger,
    spaceId,
    concurrencyGroupKey,
    concurrencySettings,
  } = params;

  if (concurrencySettings.strategy !== 'queue') {
    return;
  }

  const maxConcurrency = concurrencySettings.max ?? 1;

  for (;;) {
    const slotCount =
      await workflowExecutionRepository.countExecutionsByConcurrencyGroupAndStatuses(
        concurrencyGroupKey,
        spaceId,
        ConcurrencySlotOccupyingExecutionStatuses
      );

    if (slotCount >= maxConcurrency) {
      return;
    }

    const nextQueuedId =
      await workflowExecutionRepository.getOldestQueuedExecutionIdByConcurrencyGroup(
        concurrencyGroupKey,
        spaceId
      );

    if (!nextQueuedId) {
      return;
    }

    const promoted =
      await workflowExecutionRepository.tryCasPromoteQueuedWorkflowExecutionToPending({
        workflowExecutionId: nextQueuedId,
        spaceId,
      });

    if (promoted) {
      const execution = await workflowExecutionRepository.getWorkflowExecutionById(
        nextQueuedId,
        spaceId
      );

      if (execution?.status === ExecutionStatus.PENDING) {
        if (!execution.id || !execution.spaceId) {
          logger.warn(
            `Promoted queued execution ${nextQueuedId} is missing id or spaceId; marking skipped`
          );
          const skipTimestamp = new Date().toISOString();
          await workflowExecutionRepository.updateWorkflowExecution(
            {
              id: nextQueuedId,
              status: ExecutionStatus.SKIPPED,
              cancelRequested: true,
              cancellationReason:
                'Queued promotion failed: execution document missing id or spaceId',
              cancelledAt: skipTimestamp,
              cancelledBy: 'system',
            },
            { refresh: 'wait_for' }
          );
        } else {
          const triggeredBy = execution.triggeredBy || 'manual';

          try {
            await promoteQueuedRunTaskWithRetry(workflowTaskManager, {
              executionId: execution.id,
              triggeredBy,
            });
            logger.debug(
              `Promoted queued execution ${execution.id} to pending and runSoon queued workflow:run (group ${concurrencyGroupKey})`
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn(
              `Promoted queued workflow execution ${nextQueuedId} but failed to runSoon workflow:run (${message}); reverting to queued`
            );
            await workflowExecutionRepository.updateWorkflowExecution(
              { id: nextQueuedId, status: ExecutionStatus.QUEUED },
              { refresh: 'wait_for' }
            );
            return;
          }
        }
      }
    }
  }
}

/** Pre-enqueue drain when a new execution joins a queue concurrency group. */
export async function maybeDrainConcurrencyQueueBeforeEnqueue({
  workflowExecution,
  workflowExecutionRepository,
  workflowTaskManager,
  logger,
  failureLogLabel,
}: {
  workflowExecution: Partial<
    Pick<EsWorkflowExecution, 'spaceId' | 'concurrencyGroupKey' | 'workflowDefinition'>
  >;
  workflowExecutionRepository: WorkflowExecutionRepository;
  workflowTaskManager: WorkflowTaskManager;
  logger: Logger;
  failureLogLabel: string;
}): Promise<void> {
  const concurrencySettings = workflowExecution.workflowDefinition?.settings?.concurrency;
  if (
    concurrencySettings?.strategy !== 'queue' ||
    !workflowExecution.concurrencyGroupKey ||
    !workflowExecution.spaceId
  ) {
    return;
  }

  try {
    await drainConcurrencyQueueSlots({
      workflowExecutionRepository,
      workflowTaskManager,
      logger,
      spaceId: workflowExecution.spaceId,
      concurrencyGroupKey: workflowExecution.concurrencyGroupKey,
      concurrencySettings,
    });
  } catch (drainErr) {
    logger.debug(
      `${failureLogLabel}: ${drainErr instanceof Error ? drainErr.message : String(drainErr)}`
    );
  }
}

export async function maybeDrainConcurrencyQueueAfterTerminal(params: {
  workflowExecutionRepository: WorkflowExecutionRepository;
  workflowTaskManager: WorkflowTaskManager;
  logger: Logger;
  workflowRunId: string;
  spaceId: string;
}): Promise<void> {
  const { workflowExecutionRepository, workflowTaskManager, logger, workflowRunId, spaceId } =
    params;

  try {
    const doc = await workflowExecutionRepository.getWorkflowExecutionById(workflowRunId, spaceId);
    if (!doc || !isTerminalStatus(doc.status)) {
      return;
    }
    const concurrency = doc.workflowDefinition?.settings?.concurrency;
    const groupKey = doc.concurrencyGroupKey;
    if (concurrency?.strategy !== 'queue' || !groupKey) {
      return;
    }

    await drainConcurrencyQueueSlots({
      workflowExecutionRepository,
      workflowTaskManager,
      logger,
      spaceId,
      concurrencyGroupKey: groupKey,
      concurrencySettings: concurrency,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.debug(
      `maybeDrainConcurrencyQueueAfterTerminal: drain failed for execution ${workflowRunId}: ${msg}`
    );
  }
}
