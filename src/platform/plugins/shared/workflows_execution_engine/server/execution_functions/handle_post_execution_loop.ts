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
import { isSyncParentInvocation, isTerminalStatus } from '@kbn/workflows';
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

  if (
    internalResumeWorkflowExecution &&
    finalExecution &&
    isTerminalStatus(finalExecution.status) &&
    isSyncParentInvocation(finalExecution.context)
  ) {
    const parentExecId = finalExecution.context.parentWorkflowExecutionId;
    try {
      await internalResumeWorkflowExecution(parentExecId, spaceId, undefined, fakeRequest);
      logger.info(
        `Child ${workflowRunId} completed (${finalExecution.status}), scheduled resume for parent ${parentExecId}`
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.warn(
        `Failed to resume parent after child completion (parent=${parentExecId}, child=${workflowRunId}): ${reason}`
      );
      if (workflowTaskManager) {
        try {
          const parentExecution = await workflowExecutionRepository.getWorkflowExecutionById(
            parentExecId,
            spaceId
          );
          await workflowTaskManager.scheduleImmediateResume({
            executionId: parentExecId,
            spaceId,
            fakeRequest,
            traceParent: parentExecution?.traceParent,
          });
          logger.info(
            `Scheduled immediate Task Manager resume as fallback for parent ${parentExecId} after inline resume failure`
          );
        } catch (scheduleErr) {
          const scheduleReason =
            scheduleErr instanceof Error ? scheduleErr.message : String(scheduleErr);
          logger.warn(
            `Fallback scheduleImmediateResume also failed (parent=${parentExecId}): ${scheduleReason}`
          );
        }
      }
    }
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
