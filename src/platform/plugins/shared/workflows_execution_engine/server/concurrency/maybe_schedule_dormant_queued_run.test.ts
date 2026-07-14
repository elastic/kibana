/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { type EsWorkflowExecution, ExecutionStatus } from '@kbn/workflows';

import { handleConcurrencyBlockedExecution } from './maybe_schedule_dormant_queued_run';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

describe('handleConcurrencyBlockedExecution', () => {
  const workflowExecutionId = 'child-execution-id';
  const parentWorkflowExecutionId = 'parent-execution-id';
  const spaceId = 'default';
  const request = {} as KibanaRequest;
  const logger = {
    warn: jest.fn(),
    info: jest.fn(),
  } as unknown as Logger;

  const createExecution = (overrides: Partial<EsWorkflowExecution> = {}): EsWorkflowExecution =>
    ({
      id: workflowExecutionId,
      spaceId,
      workflowId: 'child-workflow-id',
      status: ExecutionStatus.FAILED,
      context: {
        parentWorkflowInvocation: 'sync',
        parentWorkflowExecutionId,
      },
      workflowDefinition: {
        settings: {
          concurrency: {
            strategy: 'queue',
          },
        },
      },
      ...overrides,
    } as EsWorkflowExecution);

  const createDependencies = (execution: EsWorkflowExecution | null) => {
    const workflowExecutionRepository = {
      getWorkflowExecutionById: jest.fn().mockResolvedValue(execution),
    } as unknown as jest.Mocked<WorkflowExecutionRepository>;
    const workflowTaskManager = {
      scheduleDormantQueuedRunTask: jest.fn().mockResolvedValue(undefined),
      scheduleAndRunImmediateResume: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<WorkflowTaskManager>;
    const internalResumeWorkflowExecution = jest.fn().mockResolvedValue(undefined);

    return {
      workflowExecutionRepository,
      workflowTaskManager,
      internalResumeWorkflowExecution,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resumes a sync parent when the blocked child execution is terminal', async () => {
    const execution = createExecution({ status: ExecutionStatus.FAILED });
    const { workflowExecutionRepository, workflowTaskManager, internalResumeWorkflowExecution } =
      createDependencies(execution);

    await handleConcurrencyBlockedExecution({
      workflowExecutionId,
      spaceId,
      request,
      workflowExecutionRepository,
      workflowTaskManager,
      internalResumeWorkflowExecution,
      logger,
    });

    expect(internalResumeWorkflowExecution).toHaveBeenCalledWith(
      parentWorkflowExecutionId,
      spaceId,
      undefined,
      request
    );
    expect(workflowTaskManager.scheduleDormantQueuedRunTask).not.toHaveBeenCalled();
  });

  it('schedules a dormant run for queued executions without resuming a parent', async () => {
    const execution = createExecution({
      status: ExecutionStatus.QUEUED,
    });
    const { workflowExecutionRepository, workflowTaskManager, internalResumeWorkflowExecution } =
      createDependencies(execution);

    await handleConcurrencyBlockedExecution({
      workflowExecutionId,
      spaceId,
      request,
      workflowExecutionRepository,
      workflowTaskManager,
      internalResumeWorkflowExecution,
      logger,
    });

    expect(workflowTaskManager.scheduleDormantQueuedRunTask).toHaveBeenCalledWith({
      workflowExecution: execution,
      request,
    });
    expect(internalResumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('does not resume when the terminal execution has no sync parent context', async () => {
    const execution = createExecution({
      status: ExecutionStatus.SKIPPED,
      context: {
        parentWorkflowInvocation: 'async',
        parentWorkflowExecutionId,
      },
    });
    const { workflowExecutionRepository, workflowTaskManager, internalResumeWorkflowExecution } =
      createDependencies(execution);

    await handleConcurrencyBlockedExecution({
      workflowExecutionId,
      spaceId,
      request,
      workflowExecutionRepository,
      workflowTaskManager,
      internalResumeWorkflowExecution,
      logger,
    });

    expect(internalResumeWorkflowExecution).not.toHaveBeenCalled();
    expect(workflowTaskManager.scheduleDormantQueuedRunTask).not.toHaveBeenCalled();
  });

  it('does nothing when the execution cannot be found', async () => {
    const { workflowExecutionRepository, workflowTaskManager, internalResumeWorkflowExecution } =
      createDependencies(null);

    await handleConcurrencyBlockedExecution({
      workflowExecutionId,
      spaceId,
      request,
      workflowExecutionRepository,
      workflowTaskManager,
      internalResumeWorkflowExecution,
      logger,
    });

    expect(internalResumeWorkflowExecution).not.toHaveBeenCalled();
    expect(workflowTaskManager.scheduleDormantQueuedRunTask).not.toHaveBeenCalled();
  });
});
