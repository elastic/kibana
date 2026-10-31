/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { EsWorkflow } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecuteAsyncStrategy } from './workflow_execute_async_strategy';
import type { WorkflowExecutionRepository } from '../../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../../types';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';

const createMockWorkflow = (overrides: Partial<EsWorkflow> = {}): EsWorkflow =>
  ({
    id: 'child-workflow-id',
    name: 'Child Workflow',
    enabled: true,
    valid: true,
    definition: {},
    yaml: 'steps: []',
    ...overrides,
  } as EsWorkflow);

describe('WorkflowExecuteAsyncStrategy', () => {
  let strategy: WorkflowExecuteAsyncStrategy;
  let mockEngine: jest.Mocked<WorkflowsExecutionEnginePluginStart>;
  let mockExecRepo: jest.Mocked<WorkflowExecutionRepository>;
  let mockStepRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockLogger: jest.Mocked<IWorkflowEventLogger>;
  let mockRequest: KibanaRequest;

  beforeEach(() => {
    mockEngine = {
      executeWorkflow: jest.fn().mockResolvedValue({ workflowExecutionId: 'async-exec-1' }),
    } as any;

    mockExecRepo = {
      getWorkflowExecutionById: jest.fn().mockResolvedValue({
        id: 'async-exec-1',
        startedAt: '2024-01-01T00:00:00Z',
        status: ExecutionStatus.PENDING,
      }),
    } as any;

    mockStepRuntime = {
      workflowExecution: {
        id: 'parent-exec-1',
        workflowId: 'parent-workflow-id',
        isTestRun: false,
      },
      node: { stepId: 'async-step-1' },
    } as any;

    mockLogger = {
      logInfo: jest.fn(),
      logDebug: jest.fn(),
      logError: jest.fn(),
    } as any;

    mockRequest = {} as KibanaRequest;

    strategy = new WorkflowExecuteAsyncStrategy(
      mockEngine,
      mockExecRepo,
      mockStepRuntime,
      mockLogger
    );
  });

  it('keeps the saved caller name separate from the prefixed runtime step ID', async () => {
    mockStepRuntime.node.stepId = 'workflow-level-on-failure_fail_child';
    await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0, true, 'child');
    expect(mockEngine.executeWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        inheritParentIdentity: true,
        parentStepId: 'workflow-level-on-failure_fail_child',
        parentStepName: 'child',
      }),
      mockRequest
    );
  });

  it('should execute the workflow via the engine', async () => {
    const workflow = createMockWorkflow();
    const inputs = { param1: 'value1' };

    await strategy.execute(workflow, inputs, 'default', mockRequest, 0, false, 'async-step-1');

    expect(mockEngine.executeWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'child-workflow-id',
        name: 'Child Workflow',
        isTestRun: false,
        isEphemeral: false,
      }),
      expect.objectContaining({
        spaceId: 'default',
        inputs: { param1: 'value1' },
        triggeredBy: 'workflow-step',
        parentWorkflowInvocation: 'async',
        parentWorkflowId: 'parent-workflow-id',
        parentWorkflowExecutionId: 'parent-exec-1',
        parentStepId: 'async-step-1',
        parentDepth: 0,
      }),
      mockRequest
    );
  });

  it('forwards document version from repository-loaded workflow', async () => {
    await strategy.execute(
      createMockWorkflow({ version: 5 }),
      {},
      'default',
      mockRequest,
      0,
      false,
      'async-step-1'
    );

    expect(mockEngine.executeWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'child-workflow-id', version: 5 }),
      expect.any(Object),
      mockRequest
    );
  });

  it('should return completed status with execution metadata', async () => {
    const result = await strategy.execute(
      createMockWorkflow(),
      {},
      'default',
      mockRequest,
      0,
      false,
      'async-step-1'
    );

    expect(result).toEqual({
      status: 'completed',
      output: {
        workflowId: 'child-workflow-id',
        executionId: 'async-exec-1',
        awaited: false,
        status: 'pending',
        startedAt: '2024-01-01T00:00:00Z',
      },
    });
  });

  it.each([ExecutionStatus.SKIPPED, ExecutionStatus.FAILED, ExecutionStatus.RUNNING])(
    'should report the child status "%s" the engine already recorded',
    async (status) => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'async-exec-1',
        startedAt: '2024-01-01T00:00:00Z',
        status,
      } as any);

      const result = await strategy.execute(
        createMockWorkflow(),
        {},
        'default',
        mockRequest,
        0,
        false,
        'async-step-1'
      );

      expect(result.status).toBe('completed');
      expect(result.output).toEqual(expect.objectContaining({ status, awaited: false }));
    }
  );

  it('should fall back to pending when execution fetch returns null', async () => {
    mockExecRepo.getWorkflowExecutionById.mockResolvedValue(null);

    const result = await strategy.execute(
      createMockWorkflow(),
      {},
      'default',
      mockRequest,
      0,
      false,
      'async-step-1'
    );

    expect(result.output).toEqual(expect.objectContaining({ status: 'pending' }));
  });

  it('should omit startedAt when execution fetch returns null', async () => {
    mockExecRepo.getWorkflowExecutionById.mockResolvedValue(null);

    const result = await strategy.execute(
      createMockWorkflow(),
      {},
      'default',
      mockRequest,
      0,
      false,
      'async-step-1'
    );

    expect(result.status).toBe('completed');
    expect(result.output).not.toHaveProperty('startedAt');
  });

  it('should propagate isTestRun flag', async () => {
    (mockStepRuntime.workflowExecution as any).isTestRun = true;

    await strategy.execute(
      createMockWorkflow(),
      {},
      'default',
      mockRequest,
      0,
      false,
      'async-step-1'
    );

    expect(mockEngine.executeWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ isTestRun: true, isEphemeral: false }),
      expect.any(Object),
      mockRequest
    );
  });

  it('should return failed status when engine throws', async () => {
    mockEngine.executeWorkflow.mockRejectedValue(new Error('Engine unavailable'));

    const result = await strategy.execute(
      createMockWorkflow(),
      {},
      'default',
      mockRequest,
      0,
      false,
      'async-step-1'
    );

    expect(result).toEqual({
      status: 'failed',
      error: expect.objectContaining({ message: 'Engine unavailable' }),
    });
  });

  it('should propagate parentDepth correctly', async () => {
    await strategy.execute(
      createMockWorkflow(),
      {},
      'default',
      mockRequest,
      5,
      false,
      'async-step-1'
    );

    expect(mockEngine.executeWorkflow).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ parentDepth: 5 }),
      mockRequest
    );
  });

  describe('execution chain in the child context', () => {
    const getChildContext = (): Record<string, unknown> =>
      mockEngine.executeWorkflow.mock.calls[0][1] as Record<string, unknown>;

    it("makes a top-level parent the only hop of its direct child's chain", async () => {
      (mockStepRuntime.workflowExecution as any).context = {};

      await strategy.execute(
        createMockWorkflow(),
        {},
        'default',
        mockRequest,
        0,
        false,
        'async-step-1'
      );

      expect(getChildContext()).toEqual(
        expect.objectContaining({
          executionChain: [
            { executionId: 'parent-exec-1', invocation: 'async', workflowId: 'parent-workflow-id' },
          ],
        })
      );
    });

    it("appends the parent to a grandchild's chain after the top-level hop", async () => {
      (mockStepRuntime.workflowExecution as any).context = {
        executionChain: [
          { executionId: 'top-exec-1', invocation: 'sync', workflowId: 'top-workflow-id' },
        ],
        parentWorkflowExecutionId: 'top-exec-1',
        parentWorkflowId: 'top-workflow-id',
      };
      (mockStepRuntime.workflowExecution as any).triggeredBy = 'workflow-step';

      await strategy.execute(
        createMockWorkflow(),
        {},
        'default',
        mockRequest,
        1,
        false,
        'async-step-1'
      );

      expect(getChildContext()).toEqual(
        expect.objectContaining({
          executionChain: [
            { executionId: 'top-exec-1', invocation: 'sync', workflowId: 'top-workflow-id' },
            { executionId: 'parent-exec-1', invocation: 'async', workflowId: 'parent-workflow-id' },
          ],
          parentWorkflowExecutionId: 'parent-exec-1',
          parentWorkflowId: 'parent-workflow-id',
        })
      );
    });

    it('keeps the execution chain next to an inherited service account', async () => {
      (mockStepRuntime.workflowExecution as any).context = {};

      await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0, true, 'child');

      expect(getChildContext()).toEqual(
        expect.objectContaining({
          executionChain: [
            { executionId: 'parent-exec-1', invocation: 'async', workflowId: 'parent-workflow-id' },
          ],
          inheritParentIdentity: true,
          parentStepName: 'child',
        })
      );
    });

    it('omits the chain when the parent is a child without a stored chain', async () => {
      (mockStepRuntime.workflowExecution as any).context = {
        parentWorkflowExecutionId: 'unknown-exec',
        parentWorkflowId: 'unknown-workflow-id',
      };
      (mockStepRuntime.workflowExecution as any).triggeredBy = 'workflow-step';

      await strategy.execute(
        createMockWorkflow(),
        {},
        'default',
        mockRequest,
        1,
        false,
        'async-step-1'
      );

      expect(getChildContext()).not.toHaveProperty('executionChain');
      expect(getChildContext()).toEqual(
        expect.objectContaining({ parentWorkflowInvocation: 'async' })
      );
    });
  });

  it('should log info about the started execution', async () => {
    await strategy.execute(
      createMockWorkflow(),
      {},
      'default',
      mockRequest,
      0,
      false,
      'async-step-1'
    );

    expect(mockLogger.logInfo).toHaveBeenCalledWith(expect.stringContaining('async-exec-1'));
  });
});
