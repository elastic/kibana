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
import { WorkflowExecuteSyncStrategy } from './workflow_execute_sync_strategy';
import type { StepExecutionRepository } from '../../../repositories/step_execution_repository';
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

describe('WorkflowExecuteSyncStrategy', () => {
  let strategy: WorkflowExecuteSyncStrategy;
  let mockEngine: jest.Mocked<WorkflowsExecutionEnginePluginStart>;
  let mockExecRepo: jest.Mocked<WorkflowExecutionRepository>;
  let mockStepRepo: jest.Mocked<StepExecutionRepository>;
  let mockStepRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockLogger: jest.Mocked<IWorkflowEventLogger>;
  let mockRequest: KibanaRequest;

  beforeEach(() => {
    mockEngine = {
      executeWorkflow: jest.fn().mockResolvedValue({ workflowExecutionId: 'child-exec-1' }),
    } as any;

    mockExecRepo = {
      getWorkflowExecutionById: jest.fn(),
    } as any;

    mockStepRepo = {
      getStepExecutionsByWorkflowExecution: jest.fn().mockResolvedValue([]),
    } as any;

    mockStepRuntime = {
      workflowExecution: {
        id: 'parent-exec-1',
        workflowId: 'parent-workflow-id',
        isTestRun: false,
      },
      node: { stepId: 'sync-step-1' },
      abortController: new AbortController(),
      getCurrentStepState: jest.fn().mockReturnValue(undefined),
      setCurrentStepState: jest.fn(),
      tryEnterDelay: jest.fn().mockReturnValue(true),
    } as any;

    mockLogger = {
      logInfo: jest.fn(),
      logDebug: jest.fn(),
      logError: jest.fn(),
    } as any;

    mockRequest = {} as KibanaRequest;

    strategy = new WorkflowExecuteSyncStrategy(
      mockEngine,
      mockExecRepo,
      mockStepRepo,
      mockStepRuntime,
      mockLogger
    );
  });

  describe('initial execution (no existing state)', () => {
    it('should schedule sub-workflow and return waiting status', async () => {
      const result = await strategy.execute(
        createMockWorkflow(),
        { param1: 'value1' },
        'default',
        mockRequest,
        0
      );

      expect(result.status).toBe('waiting');
      expect(mockEngine.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'child-workflow-id', isTestRun: false }),
        expect.objectContaining({
          spaceId: 'default',
          inputs: { param1: 'value1' },
          triggeredBy: 'workflow-step',
          parentWorkflowId: 'parent-workflow-id',
          parentWorkflowExecutionId: 'parent-exec-1',
          parentStepId: 'sync-step-1',
          parentDepth: 0,
        }),
        mockRequest
      );
    });

    it('should save wait state with execution ID and pollCount 0', async () => {
      await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(mockStepRuntime.setCurrentStepState).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'child-workflow-id',
          executionId: 'child-exec-1',
          pollCount: 0,
        })
      );
    });

    it('should enter delay with the first poll interval', async () => {
      await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(mockStepRuntime.tryEnterDelay).toHaveBeenCalledWith('1s');
    });

    it('should propagate isTestRun flag', async () => {
      (mockStepRuntime.workflowExecution as any).isTestRun = true;

      await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(mockEngine.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ isTestRun: true }),
        expect.any(Object),
        mockRequest
      );
    });

    it('should return failed when engine throws', async () => {
      mockEngine.executeWorkflow.mockRejectedValue(new Error('Engine failed'));

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result).toEqual({
        status: 'failed',
        error: expect.objectContaining({ message: 'Engine failed' }),
      });
    });
  });

  describe('resume execution (existing state)', () => {
    const waitState = {
      workflowId: 'child-workflow-id',
      executionId: 'child-exec-1',
      startedAt: '2024-01-01T00:00:00Z',
      pollCount: 0,
    };

    beforeEach(() => {
      mockStepRuntime.getCurrentStepState.mockReturnValue(waitState);
    });

    it('should return completed with output when sub-workflow completes', async () => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
        context: { output: { result: 'done' } },
      } as any);

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result).toEqual({
        status: 'completed',
        output: { result: 'done' },
      });
    });

    it('should return failed when sub-workflow fails', async () => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.FAILED,
        error: { type: 'Error', message: 'child failed' },
      } as any);

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('child failed');
    });

    it('should return failed when sub-workflow is cancelled', async () => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.CANCELLED,
        error: null,
      } as any);

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result.status).toBe('failed');
      expect(result.error!.message).toContain('cancelled');
    });

    it('should return failed when sub-workflow times out', async () => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.TIMED_OUT,
        error: null,
      } as any);

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result.status).toBe('failed');
      expect(result.error!.message).toContain('timed_out');
    });

    it('should continue polling when sub-workflow is still running', async () => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.RUNNING,
      } as any);

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result.status).toBe('waiting');
      expect(mockStepRuntime.setCurrentStepState).toHaveBeenCalledWith(
        expect.objectContaining({ pollCount: 1 })
      );
      expect(mockStepRuntime.tryEnterDelay).toHaveBeenCalledWith('2s');
    });

    it('should use exponential backoff for poll intervals', async () => {
      mockStepRuntime.getCurrentStepState.mockReturnValue({ ...waitState, pollCount: 3 });
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.RUNNING,
      } as any);

      await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(mockStepRuntime.setCurrentStepState).toHaveBeenCalledWith(
        expect.objectContaining({ pollCount: 4 })
      );
      expect(mockStepRuntime.tryEnterDelay).toHaveBeenCalledWith('16s');
    });
  });

  describe('resume()', () => {
    it('should return same result as execute when wait state exists', async () => {
      const waitState = {
        workflowId: 'child-workflow-id',
        executionId: 'child-exec-1',
        startedAt: '2024-01-01T00:00:00Z',
        pollCount: 0,
      };
      mockStepRuntime.getCurrentStepState.mockReturnValue(waitState);
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
        context: { output: { result: 'done' } },
      } as any);

      const result = await strategy.resume('default');

      expect(result).toEqual({ status: 'completed', output: { result: 'done' } });
      expect(mockEngine.executeWorkflow).not.toHaveBeenCalled();
    });

    it('should return failed when no wait state', async () => {
      mockStepRuntime.getCurrentStepState.mockReturnValue(undefined);

      const result = await strategy.resume('default');

      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('Cannot resume');
      expect(mockExecRepo.getWorkflowExecutionById).not.toHaveBeenCalled();
    });

    it('should return failed when state has no executionId', async () => {
      mockStepRuntime.getCurrentStepState.mockReturnValue({ workflowId: 'w1' });

      const result = await strategy.resume('default');

      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('Cannot resume');
      expect(mockExecRepo.getWorkflowExecutionById).not.toHaveBeenCalled();
    });
  });

  describe('canResume()', () => {
    it('returns true when step state has executionId', () => {
      mockStepRuntime.getCurrentStepState.mockReturnValue({
        workflowId: 'w1',
        executionId: 'exec-123',
        startedAt: '2024-01-01T00:00:00Z',
        pollCount: 0,
      });

      expect(strategy.canResume()).toBe(true);
    });

    it('returns false when step state is undefined', () => {
      mockStepRuntime.getCurrentStepState.mockReturnValue(undefined);

      expect(strategy.canResume()).toBe(false);
    });

    it('returns false when step state has no executionId', () => {
      mockStepRuntime.getCurrentStepState.mockReturnValue({ workflowId: 'w1' });

      expect(strategy.canResume()).toBe(false);
    });
  });

  describe('getExecutionIdForCancel()', () => {
    it('returns executionId when step state has it', () => {
      mockStepRuntime.getCurrentStepState.mockReturnValue({
        workflowId: 'w1',
        executionId: 'exec-456',
        startedAt: '2024-01-01T00:00:00Z',
        pollCount: 1,
      });

      expect(strategy.getExecutionIdForCancel()).toBe('exec-456');
    });

    it('returns undefined when step state is undefined', () => {
      mockStepRuntime.getCurrentStepState.mockReturnValue(undefined);

      expect(strategy.getExecutionIdForCancel()).toBeUndefined();
    });

    it('returns undefined when step state has no executionId', () => {
      mockStepRuntime.getCurrentStepState.mockReturnValue({});

      expect(strategy.getExecutionIdForCancel()).toBeUndefined();
    });
  });

  describe('output extraction', () => {
    const waitState = {
      workflowId: 'child-workflow-id',
      executionId: 'child-exec-1',
      startedAt: '2024-01-01T00:00:00Z',
      pollCount: 0,
    };

    beforeEach(() => {
      mockStepRuntime.getCurrentStepState.mockReturnValue(waitState);
    });

    it('should fail when execution is not found', async () => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue(null);

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result.status).toBe('failed');
      expect(result.error!.message).toContain('not found');
    });

    it('should fail when execution repo throws', async () => {
      mockExecRepo.getWorkflowExecutionById.mockRejectedValue(new Error('ES unavailable'));

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result).toEqual({
        status: 'failed',
        error: expect.objectContaining({ message: 'ES unavailable' }),
      });
    });

    it('should use workflow.output from context when available', async () => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
        context: { output: { message: 'from workflow.output' } },
      } as any);

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result).toEqual({
        status: 'completed',
        output: { message: 'from workflow.output' },
      });
      expect(mockStepRepo.getStepExecutionsByWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should fall back to step executions when no context output', async () => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
        context: {},
        stepExecutionIds: ['step-1'],
      } as any);

      mockStepRepo.getStepExecutionsByWorkflowExecution.mockResolvedValue([
        {
          id: 'step-1',
          stepId: 'step1',
          spaceId: 'default',
          scopeStack: [],
          output: { data: 'from last step' },
        },
      ] as any);

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result.status).toBe('completed');
      expect(result.output).toEqual({ data: 'from last step' });
      expect(mockStepRepo.getStepExecutionsByWorkflowExecution).toHaveBeenCalledWith(
        'child-exec-1',
        ['step-1']
      );
    });

    it('should return null output when no step executions exist', async () => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
        context: {},
        stepExecutionIds: [],
      } as any);

      mockStepRepo.getStepExecutionsByWorkflowExecution.mockResolvedValue([]);

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result.status).toBe('completed');
      expect(result.output).toBeUndefined();
    });

    it('should return the last step output at top level', async () => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
        context: {},
        stepExecutionIds: ['step-exec-1', 'step-exec-2'],
      } as any);

      mockStepRepo.getStepExecutionsByWorkflowExecution.mockResolvedValue([
        {
          id: 'step-exec-1',
          stepId: 'step1',
          spaceId: 'default',
          scopeStack: [],
          output: { first: true },
        },
        {
          id: 'step-exec-2',
          stepId: 'step2',
          spaceId: 'default',
          scopeStack: [],
          output: { second: true },
        },
      ] as any);

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result.status).toBe('completed');
      expect(result.output).toEqual({ second: true });
    });

    it('should recurse into children of the last top-level step', async () => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
        context: {},
        stepExecutionIds: ['step-exec-1', 'step-exec-2', 'step-exec-3'],
      } as any);

      mockStepRepo.getStepExecutionsByWorkflowExecution.mockResolvedValue([
        {
          id: 'step-exec-1',
          stepId: 'step1',
          spaceId: 'default',
          scopeStack: [],
          output: { top: true },
        },
        {
          id: 'step-exec-2',
          stepId: 'step2',
          spaceId: 'default',
          scopeStack: [],
          output: undefined,
        },
        {
          id: 'step-exec-3',
          stepId: 'child-step',
          spaceId: 'default',
          scopeStack: [{ stepId: 'step2' }],
          output: { nested: true },
        },
      ] as any);

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result.status).toBe('completed');
      expect(result.output).toEqual([{ nested: true }]);
    });

    it('should handle null output from context as undefined step output', async () => {
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
        context: { output: null },
      } as any);

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result.status).toBe('completed');
      expect(result.output).toBeUndefined();
    });
  });

  describe('cancellation during execution', () => {
    it('should skip tryEnterDelay on initial execution when aborted', async () => {
      mockStepRuntime.abortController.abort();

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result.status).toBe('cancelled');
      expect(mockStepRuntime.setCurrentStepState).toHaveBeenCalledWith(
        expect.objectContaining({ executionId: 'child-exec-1' })
      );
      expect(mockStepRuntime.tryEnterDelay).not.toHaveBeenCalled();
    });

    it('should skip tryEnterDelay on resume poll when aborted', async () => {
      const waitState = {
        workflowId: 'child-workflow-id',
        executionId: 'child-exec-1',
        startedAt: '2024-01-01T00:00:00Z',
        pollCount: 0,
      };
      mockStepRuntime.getCurrentStepState.mockReturnValue(waitState);
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.RUNNING,
      } as any);

      mockStepRuntime.abortController.abort();

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result.status).toBe('cancelled');
      expect(mockStepRuntime.setCurrentStepState).toHaveBeenCalledWith(
        expect.objectContaining({ pollCount: 1 })
      );
      expect(mockStepRuntime.tryEnterDelay).not.toHaveBeenCalled();
    });

    it('should still process terminal status when aborted', async () => {
      const waitState = {
        workflowId: 'child-workflow-id',
        executionId: 'child-exec-1',
        startedAt: '2024-01-01T00:00:00Z',
        pollCount: 0,
      };
      mockStepRuntime.getCurrentStepState.mockReturnValue(waitState);
      mockExecRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
        context: { output: { result: 'done' } },
      } as any);

      mockStepRuntime.abortController.abort();

      const result = await strategy.execute(createMockWorkflow(), {}, 'default', mockRequest, 0);

      expect(result).toEqual({ status: 'completed', output: { result: 'done' } });
    });
  });
});
