/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import { resumeWorkflow } from './resume_workflow';
import { setupDependencies } from './setup_dependencies';
import { workflowExecutionLoop } from '../workflow_execution_loop';

jest.mock('./setup_dependencies');
jest.mock('../workflow_execution_loop', () => ({
  workflowExecutionLoop: jest.fn().mockResolvedValue(undefined),
}));

const setupDependenciesMock = setupDependencies as jest.MockedFunction<typeof setupDependencies>;
const workflowExecutionLoopMock = workflowExecutionLoop as jest.MockedFunction<
  typeof workflowExecutionLoop
>;

describe('resumeWorkflow', () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;
  const fakeRequest = {} as KibanaRequest;
  const dependencies = { coreStart: {} } as any;
  const config = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not resume or run loop when execution is already terminal', async () => {
    const resume = jest.fn().mockResolvedValue(undefined);
    setupDependenciesMock.mockResolvedValue({
      workflowRuntime: { resume },
      stepExecutionRuntimeFactory: {},
      workflowExecutionState: {
        getWorkflowExecution: () => ({
          status: ExecutionStatus.COMPLETED,
        }),
      },
      workflowLogger: {},
      nodesFactory: {},
      workflowExecutionGraph: {},
      esClient: {},
      workflowTaskManager: {},
      workflowExecutionRepository: {},
    } as any);

    await resumeWorkflow({
      workflowRunId: 'exec-1',
      spaceId: 'default',
      taskAbortController: new AbortController(),
      dependencies,
      logger,
      config,
      fakeRequest,
    });

    expect(resume).not.toHaveBeenCalled();
    expect(workflowExecutionLoopMock).not.toHaveBeenCalled();
  });

  it('runs resume and loop when execution is not terminal', async () => {
    const resume = jest.fn().mockResolvedValue(undefined);
    setupDependenciesMock.mockResolvedValue({
      workflowRuntime: { resume },
      stepExecutionRuntimeFactory: {},
      workflowExecutionState: {
        getWorkflowExecution: () => ({
          status: ExecutionStatus.WAITING,
        }),
      },
      workflowLogger: {},
      nodesFactory: {},
      workflowExecutionGraph: {},
      esClient: {},
      workflowTaskManager: {},
      workflowExecutionRepository: {
        getWorkflowExecutionById: jest.fn().mockResolvedValue(null),
      },
    } as any);

    await resumeWorkflow({
      workflowRunId: 'exec-1',
      spaceId: 'default',
      taskAbortController: new AbortController(),
      dependencies,
      logger,
      config,
      fakeRequest,
    });

    expect(resume).toHaveBeenCalledTimes(1);
    expect(workflowExecutionLoopMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['FAILED', ExecutionStatus.FAILED],
    ['CANCELLED', ExecutionStatus.CANCELLED],
    ['SKIPPED', ExecutionStatus.SKIPPED],
    ['COMPLETED', ExecutionStatus.COMPLETED],
    ['TIMED_OUT', ExecutionStatus.TIMED_OUT],
  ] as const)('skips resume when already %s (stale TM / duplicate resume)', async (_, status) => {
    const resume = jest.fn().mockResolvedValue(undefined);
    setupDependenciesMock.mockResolvedValue({
      workflowRuntime: { resume },
      stepExecutionRuntimeFactory: {},
      workflowExecutionState: {
        getWorkflowExecution: () => ({ status }),
      },
      workflowLogger: {},
      nodesFactory: {},
      workflowExecutionGraph: {},
      esClient: {},
      workflowTaskManager: {},
      workflowExecutionRepository: {},
    } as any);

    await resumeWorkflow({
      workflowRunId: 'exec-1',
      spaceId: 'default',
      taskAbortController: new AbortController(),
      dependencies,
      logger,
      config,
      fakeRequest,
    });

    expect(resume).not.toHaveBeenCalled();
    expect(workflowExecutionLoopMock).not.toHaveBeenCalled();
  });

  it('runs resume when status is RUNNING (e.g. mid-loop)', async () => {
    const resume = jest.fn().mockResolvedValue(undefined);
    setupDependenciesMock.mockResolvedValue({
      workflowRuntime: { resume },
      stepExecutionRuntimeFactory: {},
      workflowExecutionState: {
        getWorkflowExecution: () => ({
          status: ExecutionStatus.RUNNING,
        }),
      },
      workflowLogger: {},
      nodesFactory: {},
      workflowExecutionGraph: {},
      esClient: {},
      workflowTaskManager: {},
      workflowExecutionRepository: {
        getWorkflowExecutionById: jest.fn().mockResolvedValue(null),
      },
    } as any);

    await resumeWorkflow({
      workflowRunId: 'exec-1',
      spaceId: 'default',
      taskAbortController: new AbortController(),
      dependencies,
      logger,
      config,
      fakeRequest,
    });

    expect(resume).toHaveBeenCalledTimes(1);
    expect(workflowExecutionLoopMock).toHaveBeenCalledTimes(1);
  });
});
