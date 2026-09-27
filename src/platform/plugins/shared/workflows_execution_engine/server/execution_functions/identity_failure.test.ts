/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { usageApiPluginMock } from '@kbn/usage-api-plugin/server/mocks';
import { ExecutionStatus } from '@kbn/workflows';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { getEventChainContext } from '@kbn/workflows-extensions/server';
import { mockContextDependencies } from './__mock__/context_dependencies';
import {
  createFakeKibanaRequest,
  createMockLogger,
  createMockStepExecutionRepository,
  createMockWorkflowExecutionEngineConfig,
} from './execution_functions_test_utils';
import { resumeWorkflow } from './resume_workflow';
import { runWorkflow } from './run_workflow';
import { setupDependencies } from './setup_dependencies';
import { drainConcurrencyQueueSlots } from '../concurrency/concurrency_queue_drainer';
import { WorkflowsMeteringService } from '../metering';
import { workflowsExecutionEngineMock } from '../mocks';
import { createMockWorkflowDataClient } from '../repositories/data_access_layer/mocks';
import { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

jest.mock('./setup_dependencies');
jest.mock('../concurrency/concurrency_queue_drainer');

const setup = () => {
  const dependencies = mockContextDependencies();
  const accounts = dependencies.coreStart.security.serviceAccounts;
  jest.spyOn(accounts, 'isEnabled').mockReturnValue(true);
  jest
    .spyOn(accounts, 'withScopedRequestForWorkload')
    .mockRejectedValue(new Error('Binding changed'));
  let execution: EsWorkflowExecution = {
    id: 'child',
    workflowId: 'workflow',
    spaceId: 'default',
    status: ExecutionStatus.RUNNING,
    isTestRun: false,
    context: { parentWorkflowInvocation: 'sync', parentWorkflowExecutionId: 'parent' },
    yaml: '',
    scopeStack: [],
    createdAt: '2026-09-22T00:00:00Z',
    startedAt: '2026-09-22T00:00:00Z',
    finishedAt: '',
    error: null,
    cancelRequested: false,
    duration: 0,
    concurrencyGroupKey: 'group',
    workflowDefinition: {
      version: '1',
      name: 'Bound child',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [],
      settings: { run_as: 'account-a', concurrency: { strategy: 'queue', max: 1 } },
    },
  };
  let seqNo = 1;
  const dataClient = createMockWorkflowDataClient();
  dataClient.getByIds.mockImplementation(async () => ({
    items: [{ document: execution, index: '.workflows-executions', seqNo, primaryTerm: 1 }],
    missing: [],
  }));
  dataClient.bulk.mockImplementation(async ({ items }) => {
    const item = items[0];
    if (item.seqNo !== seqNo) {
      return {
        errors: true,
        items: [
          {
            id: 'child',
            index: '.workflows-executions',
            error: { type: 'version_conflict_engine_exception' },
          },
        ],
      };
    }
    execution = { ...execution, ...item.document };
    seqNo++;
    return { errors: false, items: [{ id: 'child', index: '.workflows-executions' }] };
  });
  const repository = new WorkflowExecutionRepository(dataClient);
  jest.spyOn(repository, 'tryUpdateWorkflowExecutionWithVersion');
  jest.spyOn(repository, 'getWorkflowExecutionById').mockImplementation(async () => execution);
  jest.spyOn(repository, 'updateWorkflowExecution').mockImplementation(async (update) => {
    execution = { ...execution, ...update };
    seqNo++;
  });
  const meteringService = new WorkflowsMeteringService(
    usageApiPluginMock.createSetupContract().usageReporting,
    createMockLogger()
  );
  jest.spyOn(meteringService, 'reportWorkflowExecution').mockResolvedValue(undefined);
  return {
    accounts,
    dataClient,
    setTestRun: () => {
      execution.isTestRun = true;
    },
    setStatus: (status: ExecutionStatus) => {
      execution.status = status;
    },
    params: {
      workflowRunId: 'child',
      spaceId: 'default',
      signal: new AbortController().signal,
      logger: createMockLogger(),
      config: createMockWorkflowExecutionEngineConfig(),
      fakeRequest: createFakeKibanaRequest(),
      dependencies,
      workflowsExecutionEngine: workflowsExecutionEngineMock.createStart(),
      internalResumeWorkflowExecution: jest.fn().mockResolvedValue(undefined),
      meteringService,
      workflowExecutionRepository: repository,
      stepExecutionRepository: createMockStepExecutionRepository(),
    },
  };
};

describe.each([
  ['run', runWorkflow],
  ['resume', resumeWorkflow],
] as const)('%s identity failure', (_name, execute) => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(drainConcurrencyQueueSlots).mockReset();
  });

  it('finalizes the execution and immediately wakes its parent, drains the queue and reports metering', async () => {
    const { params } = setup();
    await expect(execute(params)).rejects.toThrow('Binding changed');
    expect(params.stepExecutionRepository.markNonTerminalStepsFailed).toHaveBeenCalledWith(
      'child',
      expect.objectContaining({ type: 'ServiceAccountExecutionError' })
    );
    expect(params.internalResumeWorkflowExecution).toHaveBeenCalledWith(
      'parent',
      'default',
      undefined
    );
    expect(drainConcurrencyQueueSlots).toHaveBeenCalledWith(
      expect.objectContaining({ concurrencyGroupKey: 'group' })
    );
    expect(params.meteringService.reportWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({ status: ExecutionStatus.FAILED, finishedAt: expect.any(String) }),
      params.dependencies.cloudSetup
    );
    expect(setupDependencies).not.toHaveBeenCalled();
  });

  it('emits a failure event using the original request when minting fails', async () => {
    const { params } = setup();
    await expect(execute(params)).rejects.toThrow('Binding changed');
    expect(params.workflowsExecutionEngine.triggerEvents.emitEvent).toHaveBeenCalledWith({
      triggerId: 'workflows.failed',
      request: params.fakeRequest,
      payload: expect.objectContaining({
        workflow: expect.objectContaining({ id: 'workflow' }),
        execution: expect.objectContaining({ id: 'child' }),
        error: { message: 'Binding changed' },
      }),
    });
    await execute(params);
    expect(params.workflowsExecutionEngine.triggerEvents.emitEvent).toHaveBeenCalledTimes(1);
  });

  it('preserves event-chain limits when failure occurs before runtime setup', async () => {
    const { params } = setup();
    await params.workflowExecutionRepository.updateWorkflowExecution({
      id: 'child',
      context: { event: { eventChainDepth: 3, eventChainVisitedWorkflowIds: ['upstream'] } },
    });
    await expect(execute(params)).rejects.toThrow('Binding changed');
    expect(getEventChainContext(params.fakeRequest)).toEqual({
      depth: 3,
      sourceExecutionId: 'child',
      visitedWorkflowIds: ['upstream', 'workflow'],
    });
  });

  it('still completes cleanup when failure-event dispatch throws', async () => {
    const { params } = setup();
    params.workflowsExecutionEngine.triggerEvents.emitEvent.mockRejectedValue(
      new Error('Dispatch unavailable')
    );
    await expect(execute(params)).rejects.toThrow('Binding changed');
    expect(params.workflowsExecutionEngine.triggerEvents.emitEvent).toHaveBeenCalledTimes(1);
    expect(params.internalResumeWorkflowExecution).toHaveBeenCalledTimes(1);
    expect(drainConcurrencyQueueSlots).toHaveBeenCalledTimes(1);
    expect(params.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Dispatch unavailable')
    );
  });

  it('does not emit identity-failure events for test runs', async () => {
    const { params, setTestRun } = setup();
    setTestRun();
    await expect(execute(params)).rejects.toThrow('Binding changed');
    expect(params.workflowsExecutionEngine.triggerEvents.emitEvent).not.toHaveBeenCalled();
  });

  it('retries parent and queue cleanup after a transient post-execution read failure', async () => {
    const { params, accounts } = setup();
    const repository = params.workflowExecutionRepository;
    const execution = await repository.getWorkflowExecutionById('child', 'default');
    jest
      .spyOn(repository, 'getWorkflowExecutionById')
      .mockResolvedValueOnce(execution)
      .mockRejectedValueOnce(new Error('Transient post-execution read failure'));

    await expect(execute(params)).rejects.toThrow('Binding changed');
    expect((await repository.getWorkflowExecutionById('child', 'default'))?.status).toBe(
      ExecutionStatus.FAILED
    );
    expect(params.internalResumeWorkflowExecution).not.toHaveBeenCalled();
    expect(drainConcurrencyQueueSlots).not.toHaveBeenCalled();

    await execute(params);

    expect(accounts.withScopedRequestForWorkload).toHaveBeenCalledTimes(1);
    expect(repository.tryUpdateWorkflowExecutionWithVersion).toHaveBeenCalledTimes(1);
    expect(repository.updateWorkflowExecution).toHaveBeenCalledTimes(1);
    expect({
      parentResumes: params.internalResumeWorkflowExecution.mock.calls,
      queueDrains: jest.mocked(drainConcurrencyQueueSlots).mock.calls,
    }).toEqual({
      parentResumes: [['parent', 'default', undefined]],
      queueDrains: [[expect.objectContaining({ concurrencyGroupKey: 'group' })]],
    });
  });

  it.each([
    ExecutionStatus.COMPLETED,
    ExecutionStatus.FAILED,
    ExecutionStatus.CANCELLED,
    ExecutionStatus.SKIPPED,
  ])('does not remint or rewrite a terminal execution (%s)', async (status) => {
    const { params, accounts, setStatus } = setup();
    setStatus(status);
    await execute(params);
    expect(accounts.withScopedRequestForWorkload).not.toHaveBeenCalled();
    expect(params.workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
    expect(params.stepExecutionRepository.markNonTerminalStepsFailed).not.toHaveBeenCalled();
    expect(setupDependencies).not.toHaveBeenCalled();
    expect(params.internalResumeWorkflowExecution).not.toHaveBeenCalled();
    expect(drainConcurrencyQueueSlots).not.toHaveBeenCalled();
    expect(params.meteringService.reportWorkflowExecution).not.toHaveBeenCalled();
  });

  it('does not repeat successful identity-failure cleanup on a later invocation', async () => {
    const { params } = setup();
    await expect(execute(params)).rejects.toThrow('Binding changed');
    await execute(params);
    expect(params.internalResumeWorkflowExecution).toHaveBeenCalledTimes(1);
    expect(drainConcurrencyQueueSlots).toHaveBeenCalledTimes(1);
    expect(params.meteringService.reportWorkflowExecution).toHaveBeenCalledTimes(1);
  });
  it('retries failed queue cleanup and retains the marker until it succeeds', async () => {
    const { params } = setup();
    jest.mocked(drainConcurrencyQueueSlots).mockRejectedValueOnce(new Error('ES unavailable'));
    await expect(execute(params)).rejects.toThrow('queue cleanup is still pending');
    expect(
      (await params.workflowExecutionRepository.getWorkflowExecutionById('child', 'default'))
        ?.context?.serviceAccountFailureCleanupPending
    ).toBe(true);
    await execute(params);
    expect(drainConcurrencyQueueSlots).toHaveBeenCalledTimes(2);
    expect(
      (await params.workflowExecutionRepository.getWorkflowExecutionById('child', 'default'))
        ?.context?.serviceAccountFailureCleanupPending
    ).toBe(false);
  });

  it.each(['during minting', 'during finalization'])(
    'preserves a cancellation committed %s',
    async (when) => {
      const { params, accounts } = setup();
      const cancel = async () =>
        params.workflowExecutionRepository.updateWorkflowExecution({
          id: 'child',
          status: ExecutionStatus.CANCELLED,
          cancelRequested: true,
        });
      if (when === 'during minting') {
        jest.mocked(accounts.withScopedRequestForWorkload).mockImplementationOnce(async () => {
          await cancel();
          throw new Error('Binding changed');
        });
      } else {
        jest
          .mocked(params.stepExecutionRepository.markNonTerminalStepsFailed)
          .mockImplementationOnce(cancel);
      }
      await expect(execute(params)).rejects.toThrow('Binding changed');
      expect(
        (await params.workflowExecutionRepository.getWorkflowExecutionById('child', 'default'))
          ?.status
      ).toBe(ExecutionStatus.CANCELLED);
      expect(params.workflowsExecutionEngine.triggerEvents.emitEvent).not.toHaveBeenCalled();
    }
  );

  it('finalizes a pending cancellation instead of emitting an identity-failure event', async () => {
    const { params, accounts } = setup();
    jest.mocked(accounts.withScopedRequestForWorkload).mockImplementationOnce(async () => {
      await params.workflowExecutionRepository.updateWorkflowExecution({
        id: 'child',
        cancelRequested: true,
      });
      throw new Error('Binding changed');
    });
    await expect(execute(params)).rejects.toThrow('Binding changed');
    expect(
      (await params.workflowExecutionRepository.getWorkflowExecutionById('child', 'default'))
        ?.status
    ).toBe(ExecutionStatus.CANCELLED);
    expect(params.workflowsExecutionEngine.triggerEvents.emitEvent).not.toHaveBeenCalled();
    expect(drainConcurrencyQueueSlots).toHaveBeenCalledTimes(1);
  });
});
