/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { ConcurrencyCheckResult } from './concurrency_manager';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

export async function handleConcurrencyCollision(
  concurrencyCheck: ConcurrencyCheckResult,
  workflowExecutionId: string,
  workflowExecutionRepository: WorkflowExecutionRepository,
  logger: Logger
): Promise<boolean> {
  if (concurrencyCheck.shouldProceed) {
    if (concurrencyCheck.cancelledExecutionIds?.length) {
      logger.info(
        `Cancelled ${
          concurrencyCheck.cancelledExecutionIds.length
        } execution(s) due to concurrency collision: ${concurrencyCheck.cancelledExecutionIds.join(
          ', '
        )}`
      );
    }
    return true;
  }

  // Handle collision strategies: drop or queue
  if (concurrencyCheck.reason?.includes('Skipped')) {
    // Drop strategy: mark as skipped
    await workflowExecutionRepository.updateWorkflowExecution({
      id: workflowExecutionId,
      status: ExecutionStatus.SKIPPED,
      error: {
        type: 'ConcurrencyLimit',
        message: concurrencyCheck.reason,
      },
    });
    logger.info(`Workflow execution ${workflowExecutionId} skipped: ${concurrencyCheck.reason}`);
    return false;
  } else {
    // Queue strategy: keep in PENDING status
    logger.info(`Workflow execution ${workflowExecutionId} queued: ${concurrencyCheck.reason}`);
    return false;
  }
}
