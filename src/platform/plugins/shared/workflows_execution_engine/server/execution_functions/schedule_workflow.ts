/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as generateUuid } from 'uuid';
import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/**
 * Checks if there's an existing non-terminal scheduled execution for a workflow.
 * If found, creates a SKIPPED execution and returns true.
 * If not found, returns false.
 */
export async function checkAndSkipIfExistingScheduledExecution(
  workflow: WorkflowExecutionEngineModel,
  spaceId: string,
  workflowExecutionRepository: WorkflowExecutionRepository,
  logger: Logger
): Promise<boolean> {
  // Check if there's already a scheduled workflow execution in non-terminal state
  const existingExecutions = await workflowExecutionRepository.getRunningExecutionsByWorkflowId(
    workflow.id,
    spaceId,
    'scheduled'
  );

  if (existingExecutions.length > 0) {
    // There's already a non-terminal scheduled execution - create SKIPPED execution
    const workflowCreatedAt = new Date();
    const skippedExecution: Partial<EsWorkflowExecution> = {
      id: generateUuid(),
      spaceId,
      workflowId: workflow.id,
      isTestRun: workflow.isTestRun,
      workflowDefinition: workflow.definition,
      yaml: workflow.yaml,
      context: {
        workflowRunId: `scheduled-${Date.now()}`,
        spaceId,
        inputs: {},
        event: {
          type: 'scheduled',
          timestamp: new Date().toISOString(),
          source: 'task-manager',
        },
        triggeredBy: 'scheduled',
      },
      status: ExecutionStatus.SKIPPED,
      createdAt: workflowCreatedAt.toISOString(),
      createdBy: '',
      triggeredBy: 'scheduled',
      cancelRequested: true,
      cancellationReason: 'Skipped due to existing non-terminal scheduled execution',
      cancelledAt: workflowCreatedAt.toISOString(),
      cancelledBy: 'system',
    };
    await workflowExecutionRepository.createWorkflowExecution(skippedExecution);
    logger.info(
      `Skipping scheduled workflow ${workflow.id} execution - found existing non-terminal scheduled execution`
    );
    return true;
  }

  return false;
}
