/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WaitForInputStep } from '@kbn/workflows';
import type { WaitForInputGraphNode } from '@kbn/workflows/graph';
import { WaitForInputStepImpl } from './wait_for_input_step';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';

describe('WaitForInputStepImpl', () => {
  let underTest: WaitForInputStepImpl;

  let node: WaitForInputGraphNode;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let workflowLogger: IWorkflowEventLogger;

  beforeEach(() => {
    node = {
      id: 'wait-for-input-step',
      type: 'waitForInput',
      stepId: 'wait-for-input-step',
      stepType: 'waitForInput',
      configuration: {
        name: 'wait-for-input-step',
        type: 'waitForInput',
        with: { message: 'Please approve' },
      } as WaitForInputStep,
    };

    mockStepExecutionRuntime = {
      tryEnterWaitUntil: jest.fn().mockReturnValue(true),
      finishStep: jest.fn(),
      updateWorkflowExecution: jest.fn(),
      stepExecutionId: 'test-step-exec-id',
    } as unknown as jest.Mocked<StepExecutionRuntime>;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
      getWorkflowExecution: jest.fn().mockReturnValue({ context: {} }),
    } as unknown as jest.Mocked<WorkflowExecutionRuntimeManager>;

    workflowLogger = {
      logDebug: jest.fn(),
    } as unknown as IWorkflowEventLogger;

    underTest = new WaitForInputStepImpl(
      node,
      mockStepExecutionRuntime,
      mockWorkflowRuntime,
      workflowLogger
    );
  });

  describe('first run — entering wait state', () => {
    beforeEach(() => {
      mockStepExecutionRuntime.tryEnterWaitUntil.mockReturnValue(true);
    });

    it('should call tryEnterWaitUntil with no date and WAITING_FOR_INPUT status', async () => {
      await underTest.run();

      expect(mockStepExecutionRuntime.tryEnterWaitUntil).toHaveBeenCalledWith(
        undefined,
        ExecutionStatus.WAITING_FOR_INPUT
      );
    });

    it('should not finish the step on first run', async () => {
      await underTest.run();
      expect(mockStepExecutionRuntime.finishStep).not.toHaveBeenCalled();
    });

    it('should not navigate on first run', async () => {
      await underTest.run();
      expect(mockWorkflowRuntime.navigateToNextNode).not.toHaveBeenCalled();
    });

    it('should not update workflow execution context on first run', async () => {
      await underTest.run();
      expect(mockStepExecutionRuntime.updateWorkflowExecution).not.toHaveBeenCalled();
    });
  });

  describe('resume run — exiting wait state with input', () => {
    const resumeInput = { approved: true, comments: 'Looks good' };

    beforeEach(() => {
      mockStepExecutionRuntime.tryEnterWaitUntil.mockReturnValue(false);
      mockWorkflowRuntime.getWorkflowExecution.mockReturnValue({
        context: { resumeInput, otherKey: 'preserved' },
      } as any);
    });

    it('should call finishStep with the resumeInput from context', async () => {
      await underTest.run();
      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith(resumeInput);
    });

    it('should clear resumeInput from context while preserving other keys', async () => {
      await underTest.run();
      expect(mockStepExecutionRuntime.updateWorkflowExecution).toHaveBeenCalledWith({
        context: { otherKey: 'preserved' },
      });
    });

    it('should call finishStep before navigating', async () => {
      const callOrder: string[] = [];
      mockStepExecutionRuntime.finishStep.mockImplementation(() => {
        callOrder.push('finishStep');
      });
      mockWorkflowRuntime.navigateToNextNode.mockImplementation(() => {
        callOrder.push('navigateToNextNode');
      });

      await underTest.run();

      expect(callOrder).toEqual(['finishStep', 'navigateToNextNode']);
    });

    it('should navigate to the next node', async () => {
      await underTest.run();
      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });
  });

  describe('resume run — exiting wait state with no input', () => {
    beforeEach(() => {
      mockStepExecutionRuntime.tryEnterWaitUntil.mockReturnValue(false);
      mockWorkflowRuntime.getWorkflowExecution.mockReturnValue({
        context: {},
      } as any);
    });

    it('should call finishStep with undefined when resumeInput is absent', async () => {
      await underTest.run();
      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith(undefined);
    });

    it('should not throw when resumeInput is absent', async () => {
      await expect(underTest.run()).resolves.not.toThrow();
    });

    it('should not call updateWorkflowExecution when resumeInput is absent', async () => {
      await underTest.run();
      expect(mockStepExecutionRuntime.updateWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should still navigate to the next node', async () => {
      await underTest.run();
      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });
  });

  describe('resume run — exiting wait state with null context', () => {
    beforeEach(() => {
      mockStepExecutionRuntime.tryEnterWaitUntil.mockReturnValue(false);
      mockWorkflowRuntime.getWorkflowExecution.mockReturnValue({
        context: null,
      } as any);
    });

    it('should not throw when context is null', async () => {
      await expect(underTest.run()).resolves.not.toThrow();
    });

    it('should call finishStep with undefined', async () => {
      await underTest.run();
      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith(undefined);
    });

    it('should not call updateWorkflowExecution when context is null', async () => {
      await underTest.run();
      expect(mockStepExecutionRuntime.updateWorkflowExecution).not.toHaveBeenCalled();
    });
  });
});
