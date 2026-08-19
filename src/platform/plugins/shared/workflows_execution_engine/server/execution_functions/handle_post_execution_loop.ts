/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { isTerminalStatus } from '@kbn/workflows';
import { resumeSyncParentIfNeeded } from './resume_sync_parent_if_needed';
import { drainConcurrencyQueueSlots } from '../concurrency/concurrency_queue_drainer';
import type { WorkflowsMeteringService } from '../metering';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { InternalResumeWorkflowExecution } from '../types';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

export async function handlePostExecutionLoop({
  workflowRunId,
  spaceId,
  logger,
  fakeRequest,
  workflowExecutionRepository,
  internalResumeWorkflowExecution,
  workflowTaskManager,
  meteringService,
  cloudSetup,
}: {
  workflowRunId: string;
  spaceId: string;
  logger: Logger;
  fakeRequest: KibanaRequest;
  workflowExecutionRepository: WorkflowExecutionRepository;
  internalResumeWorkflowExecution?: InternalResumeWorkflowExecution;
  workflowTaskManager?: WorkflowTaskManager;
  meteringService?: WorkflowsMeteringService;
  cloudSetup?: CloudSetup;
}): Promise<void> {
  const finalExecution = await workflowExecutionRepository
    .getWorkflowExecutionById(workflowRunId, spaceId)
    .catch((err) => {
      logger.warn(
        `Failed to fetch execution after loop (execution=${workflowRunId}): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return null;
    });

  if (finalExecution && isTerminalStatus(finalExecution.status)) {
    const concurrency = finalExecution.workflowDefinition?.settings?.concurrency;
    const groupKey = finalExecution.concurrencyGroupKey;
    if (concurrency?.strategy === 'queue' && groupKey && workflowTaskManager) {
      try {
        await drainConcurrencyQueueSlots({
          workflowExecutionRepository,
          workflowTaskManager,
          logger,
          spaceId,
          concurrencyGroupKey: groupKey,
          concurrencySettings: concurrency,
        });
      } catch (drainErr) {
        logger.debug(
          `Concurrency queue drain after terminal failed for execution ${workflowRunId}: ${
            drainErr instanceof Error ? drainErr.message : String(drainErr)
          }`
        );
      }
    }
  }

  if (finalExecution) {
    await resumeSyncParentIfNeeded({
      childExecution: finalExecution,
      spaceId,
      fakeRequest,
      internalResumeWorkflowExecution,
      workflowTaskManager,
      logger,
    });
  }

  if (meteringService && finalExecution) {
    void meteringService.reportWorkflowExecution(finalExecution, cloudSetup).catch((err) => {
      logger.warn(
        `Failed to report metering (execution=${workflowRunId}): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    });
  }
}
