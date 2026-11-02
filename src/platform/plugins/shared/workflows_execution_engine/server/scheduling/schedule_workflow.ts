/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { createSchedulingHelpers, type SchedulingHelpers } from './scheduling_helpers';
import type { SchedulingDeps } from './types';
import { handleConcurrencyBlockedExecution } from '../concurrency/maybe_schedule_dormant_queued_run';
import { checkLicense } from '../lib/check_license';
import { scheduleRunTaskOrMarkFailed } from '../lib/schedule_workflow_run_task';
import { getWorkflowOriginalRequest } from '../service_account_execution';
import type { ScheduleWorkflow } from '../types';
import { generateExecutionTaskScope } from '../utils';

/** Builds the single-run `scheduleWorkflow` from explicit dependencies (no plugin start contracts). */
export const createScheduleWorkflow = (
  deps: SchedulingDeps,
  helpers: SchedulingHelpers = createSchedulingHelpers(deps)
): ScheduleWorkflow => {
  const {
    licensing,
    logger,
    workflowExecutionRepository,
    stepExecutionRepository,
    workflowTaskManager,
    getInternalResumeWorkflowExecution,
  } = deps;
  const {
    createAndPersistWorkflowExecution,
    createTaskInstance,
    scheduleDeps,
    checkConcurrencyIfNeeded: checkConcurrencyIfNeededFor,
  } = helpers;

  return async (workflow, context, originalRequest, options) => {
    const request = getWorkflowOriginalRequest(originalRequest);
    await checkLicense(licensing);

    const { workflowExecution } = await createAndPersistWorkflowExecution(
      workflow,
      context,
      'alert',
      request,
      { refresh: 'wait_for', authenticatedUser: options?.authenticatedUser }
    );

    if (workflowExecution.status === ExecutionStatus.FAILED) {
      return {
        workflowExecutionId: workflowExecution.id as string,
      };
    }

    // Check concurrency limits and apply collision strategy if needed
    const canProceed = await checkConcurrencyIfNeededFor(workflowExecution);
    if (!canProceed) {
      if (workflowExecution.id && workflowExecution.spaceId) {
        await handleConcurrencyBlockedExecution({
          workflowExecutionId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
          request,
          workflowExecutionRepository,
          stepExecutionRepository,
          workflowTaskManager,
          internalResumeWorkflowExecution: getInternalResumeWorkflowExecution(),
          logger,
        });
      }
      return {
        workflowExecutionId: workflowExecution.id as string,
      };
    }

    // Always schedule a task (never execute directly)
    const taskInstance = createTaskInstance(
      workflowExecution,
      generateExecutionTaskScope(workflowExecution as EsWorkflowExecution)
    );

    await scheduleRunTaskOrMarkFailed(scheduleDeps, taskInstance, request);
    logger.debug(
      `Scheduling workflow task with user context for workflow ${workflow.id}, execution ${workflowExecution.id}`
    );

    return {
      workflowExecutionId: workflowExecution.id as string,
    };
  };
};
