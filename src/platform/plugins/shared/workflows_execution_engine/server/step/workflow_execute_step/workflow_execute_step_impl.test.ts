/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { EsWorkflow, WorkflowRepository } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecuteGraphNode } from '@kbn/workflows/graph';
import { MAX_WORKFLOW_DEPTH } from './constants';
import { WorkflowExecuteStepImpl } from './workflow_execute_step_impl';
import type { WorkflowExecuteStepImplInit } from './workflow_execute_step_impl';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStart } from '../../types';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import { isCancellableNode } from '../node_implementation';

const createMockInit = (
  overrides: Partial<WorkflowExecuteStepImplInit> = {}
): WorkflowExecuteStepImplInit => {
  const node: WorkflowExecuteGraphNode = {
    id: 'execute-step-1',
    type: 'workflow.execute',
    stepId: 'execute-step-1',
    stepType: 'workflow.execute',
    configuration: {
      name: 'execute-step-1',
      type: 'workflow.execute' as const,
      with: {
        'workflow-id': 'child-workflow-id',
        inputs: { param1: 'value1' },
      },
    },
  };

  const mockContextManager = {
    renderValueAccordingToContext: jest.fn((value: unknown) => value),
  };

  const stepExecutionRuntime = {
    contextManager: mockContextManager,
    abortController: new AbortController(),
    startStep: jest.fn(),
    finishStep: jest.fn(),
    failStep: jest.fn(),
    setInput: jest.fn(),
    flushEventLogs: jest.fn().mockResolvedValue(undefined),
    workflowExecution: {
      id: 'exec-1',
      workflowId: 'parent-workflow-id',
      context: { parentDepth: undefined },
      isTestRun: false,
    },
    node,
    getCurrentStepState: jest.fn(),
    setCurrentStepState: jest.fn(),
    tryEnterDelay: jest.fn().mockReturnValue(true),
  } as unknown as jest.Mocked<StepExecutionRuntime>;

  const workflowExecutionRuntime = {
    navigateToNextNode: jest.fn(),
  } as unknown as jest.Mocked<WorkflowExecutionRuntimeManager>;

  const workflowRepository = {
    getWorkflow: jest.fn(),
  } as unknown as jest.Mocked<WorkflowRepository>;

  const workflowsExecutionEngine = {
    executeWorkflow: jest.fn().mockResolvedValue({ workflowExecutionId: 'child-exec-1' }),
    cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<WorkflowsExecutionEnginePluginStart>;

  const workflowExecutionRepository = {
    getWorkflowExecutionById: jest.fn(),
  } as unknown as jest.Mocked<WorkflowExecutionRepository>;

  const stepExecutionRepository = {
    searchStepExecutionsByExecutionId: jest.fn().mockResolvedValue([]),
    getStepExecutionsByWorkflowExecution: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<StepExecutionRepository>;

  const workflowLogger = {
    logInfo: jest.fn(),
    logDebug: jest.fn(),
    logError: jest.fn(),
  } as unknown as jest.Mocked<IWorkflowEventLogger>;

  return {
    node,
    stepExecutionRuntime,
    workflowExecutionRuntime,
    workflowRepository,
    spaceId: 'default',
    request: {} as KibanaRequest,
    workflowsExecutionEngine,
    workflowExecutionRepository,
    stepExecutionRepository,
    workflowLogger,
    ...overrides,
  };
};

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

describe('WorkflowExecuteStepImpl', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('run()', () => {
    it('should call startStep and setInput before executing', async () => {
      const init = createMockInit();
      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(createMockWorkflow());

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      expect(stepRuntime.startStep).toHaveBeenCalled();
      expect(stepRuntime.setInput).toHaveBeenCalledWith({
        'workflow-id': 'child-workflow-id',
        inputs: { param1: 'value1' },
      });
    });

    it('should render inputs via context manager', async () => {
      const init = createMockInit();
      const ctx = (init.stepExecutionRuntime as any).contextManager;
      ctx.renderValueAccordingToContext.mockReturnValue({
        'workflow-id': 'rendered-id',
        inputs: { rendered: true },
      });
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(createMockWorkflow({ id: 'rendered-id' }));

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      expect(ctx.renderValueAccordingToContext).toHaveBeenCalled();
      expect((init.stepExecutionRuntime as any).setInput).toHaveBeenCalledWith({
        'workflow-id': 'rendered-id',
        inputs: { rendered: true },
      });
    });

    it('should fail when depth limit is exceeded', async () => {
      const init = createMockInit();
      (init.stepExecutionRuntime as any).workflowExecution.context = {
        parentDepth: MAX_WORKFLOW_DEPTH - 1,
      };

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.failStep).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('depth limit'),
        })
      );
      expect(
        (init.workflowExecutionRuntime as jest.Mocked<WorkflowExecutionRuntimeManager>)
          .navigateToNextNode
      ).toHaveBeenCalled();
    });

    it('should compute depth correctly when parentDepth is undefined', async () => {
      const init = createMockInit();
      (init.stepExecutionRuntime as any).workflowExecution.context = {};
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(createMockWorkflow());

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.failStep).not.toHaveBeenCalled();
    });

    it('should fail when target workflow is not found', async () => {
      const init = createMockInit();
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(null);

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.failStep).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Workflow not found'),
        })
      );
      expect(
        (init.workflowExecutionRuntime as jest.Mocked<WorkflowExecutionRuntimeManager>)
          .navigateToNextNode
      ).toHaveBeenCalled();
    });

    it('should fail when workflow references itself', async () => {
      const init = createMockInit();
      (init.stepExecutionRuntime as any).workflowExecution.workflowId = 'child-workflow-id';
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(createMockWorkflow());

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.failStep).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('cannot call itself'),
        })
      );
    });

    it('should fail when target workflow is disabled', async () => {
      const init = createMockInit();
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(createMockWorkflow({ enabled: false }));

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.failStep).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('is disabled'),
        })
      );
    });

    it('should fail when target workflow is invalid', async () => {
      const init = createMockInit();
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(createMockWorkflow({ valid: false }));

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.failStep).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('is not valid'),
        })
      );
    });

    it('should use sync executor for workflow.execute type', async () => {
      const init = createMockInit();
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(createMockWorkflow());

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const engine =
        init.workflowsExecutionEngine as jest.Mocked<WorkflowsExecutionEnginePluginStart>;
      expect(engine.executeWorkflow).toHaveBeenCalled();
    });

    it('should use async executor for workflow.executeAsync type', async () => {
      const asyncNode = {
        id: 'async-step-1',
        type: 'workflow.executeAsync' as const,
        stepId: 'async-step-1',
        stepType: 'workflow.executeAsync',
        configuration: {
          name: 'async-step-1',
          type: 'workflow.executeAsync' as const,
          with: {
            'workflow-id': 'child-workflow-id',
            inputs: {},
          },
        },
      };
      const init = createMockInit({ node: asyncNode as any });
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(createMockWorkflow());
      const execRepo = init.workflowExecutionRepository as jest.Mocked<WorkflowExecutionRepository>;
      execRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        startedAt: '2024-01-01T00:00:00Z',
      } as any);

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.finishStep).toHaveBeenCalledWith(
        expect.objectContaining({
          awaited: false,
          status: 'pending',
        })
      );
    });

    it('should finish step on completed result', async () => {
      const init = createMockInit();
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(createMockWorkflow());

      (init.stepExecutionRuntime as any).getCurrentStepState.mockReturnValue({
        workflowId: 'child-workflow-id',
        executionId: 'child-exec-1',
        startedAt: '2024-01-01T00:00:00Z',
        pollCount: 0,
      });

      const execRepo = init.workflowExecutionRepository as jest.Mocked<WorkflowExecutionRepository>;
      execRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
        context: { output: { result: 'success' } },
      } as any);

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.finishStep).toHaveBeenCalledWith({ result: 'success' });
      expect(
        (init.workflowExecutionRuntime as jest.Mocked<WorkflowExecutionRuntimeManager>)
          .navigateToNextNode
      ).toHaveBeenCalled();
    });

    it('should call failStep and navigateToNextNode when executor returns failed', async () => {
      const init = createMockInit();
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(createMockWorkflow());

      (init.stepExecutionRuntime as any).getCurrentStepState.mockReturnValue({
        workflowId: 'child-workflow-id',
        executionId: 'child-exec-1',
        startedAt: '2024-01-01T00:00:00Z',
        pollCount: 0,
      });

      const execRepo = init.workflowExecutionRepository as jest.Mocked<WorkflowExecutionRepository>;
      execRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.FAILED,
        error: { type: 'Error', message: 'child workflow failed' },
      } as any);

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.failStep).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'child workflow failed' })
      );
      expect(
        (init.workflowExecutionRuntime as jest.Mocked<WorkflowExecutionRuntimeManager>)
          .navigateToNextNode
      ).toHaveBeenCalled();
    });

    it('should not navigate when sync executor returns waiting', async () => {
      const init = createMockInit();
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(createMockWorkflow());
      (init.stepExecutionRuntime as any).getCurrentStepState.mockReturnValue(undefined);

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      expect(
        (init.workflowExecutionRuntime as jest.Mocked<WorkflowExecutionRuntimeManager>)
          .navigateToNextNode
      ).not.toHaveBeenCalled();
      expect((init.stepExecutionRuntime as any).tryEnterDelay).toHaveBeenCalledWith('1s');
    });

    it('should catch and fail on unexpected errors', async () => {
      const init = createMockInit();
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockRejectedValue(new Error('Unexpected ES error'));

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.failStep).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Unexpected ES error' })
      );
    });

    it('should always flush event logs even on failure', async () => {
      const init = createMockInit();
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockRejectedValue(new Error('boom'));

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.flushEventLogs).toHaveBeenCalled();
    });

    it('should handle missing inputs gracefully', async () => {
      const nodeNoInputs = {
        id: 'step-no-inputs',
        type: 'workflow.execute' as const,
        stepId: 'step-no-inputs',
        stepType: 'workflow.execute',
        configuration: {
          name: 'step-no-inputs',
          type: 'workflow.execute' as const,
          with: {
            'workflow-id': 'child-workflow-id',
          },
        },
      };
      const init = createMockInit({ node: nodeNoInputs as any });
      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      repo.getWorkflow.mockResolvedValue(createMockWorkflow());

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.setInput).toHaveBeenCalledWith({
        'workflow-id': 'child-workflow-id',
        inputs: {},
      });
    });

    it('should skip getInput setInput getWorkflow and validation on poll resume', async () => {
      const init = createMockInit();
      (
        init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>
      ).getCurrentStepState.mockReturnValue({
        workflowId: 'child-workflow-id',
        executionId: 'child-exec-1',
        startedAt: '2024-01-01T00:00:00Z',
        pollCount: 0,
      });
      const execRepo = init.workflowExecutionRepository as jest.Mocked<WorkflowExecutionRepository>;
      execRepo.getWorkflowExecutionById.mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
        context: { output: { result: 'success' } },
      } as any);

      const step = new WorkflowExecuteStepImpl(init);
      await step.run();

      const repo = init.workflowRepository as jest.Mocked<WorkflowRepository>;
      const stepRuntime = init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>;
      expect(stepRuntime.startStep).not.toHaveBeenCalled();
      expect(repo.getWorkflow).not.toHaveBeenCalled();
      expect(init.stepExecutionRuntime.setInput).not.toHaveBeenCalled();
      expect(
        init.stepExecutionRuntime.contextManager.renderValueAccordingToContext
      ).not.toHaveBeenCalled();
      expect(stepRuntime.finishStep).toHaveBeenCalledWith({ result: 'success' });
    });
  });

  describe('onCancel()', () => {
    it('should be detected as CancellableNode', () => {
      const init = createMockInit();
      const step = new WorkflowExecuteStepImpl(init);
      expect(isCancellableNode(step)).toBe(true);
    });

    it('should cancel child workflow execution when step state has executionId', async () => {
      const init = createMockInit();
      (
        init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>
      ).getCurrentStepState.mockReturnValue({
        workflowId: 'child-workflow-id',
        executionId: 'child-exec-1',
        startedAt: '2024-01-01T00:00:00Z',
        pollCount: 1,
      });

      const step = new WorkflowExecuteStepImpl(init);
      await step.onCancel();

      const engine =
        init.workflowsExecutionEngine as jest.Mocked<WorkflowsExecutionEnginePluginStart>;
      expect(engine.cancelWorkflowExecution).toHaveBeenCalledWith('child-exec-1', 'default');
    });

    it('should do nothing when step state is undefined', async () => {
      const init = createMockInit();
      (
        init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>
      ).getCurrentStepState.mockReturnValue(undefined);

      const step = new WorkflowExecuteStepImpl(init);
      await step.onCancel();

      const engine =
        init.workflowsExecutionEngine as jest.Mocked<WorkflowsExecutionEnginePluginStart>;
      expect(engine.cancelWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should do nothing when step state has no executionId', async () => {
      const init = createMockInit();
      (
        init.stepExecutionRuntime as jest.Mocked<StepExecutionRuntime>
      ).getCurrentStepState.mockReturnValue({});

      const step = new WorkflowExecuteStepImpl(init);
      await step.onCancel();

      const engine =
        init.workflowsExecutionEngine as jest.Mocked<WorkflowsExecutionEnginePluginStart>;
      expect(engine.cancelWorkflowExecution).not.toHaveBeenCalled();
    });
  });
});
