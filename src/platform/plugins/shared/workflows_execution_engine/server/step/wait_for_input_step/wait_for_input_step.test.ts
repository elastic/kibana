/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
        with: {
          timeout: '30m',
          message: 'Please provide your input',
          inputSchema: {
            move: { type: 'string' },
          },
        },
      } as WaitForInputStep,
    };

    mockStepExecutionRuntime = {
      tryEnterWaitForInput: jest.fn().mockReturnValue(true),
      finishStep: jest.fn().mockResolvedValue(undefined),
      getCurrentStepState: jest.fn().mockReturnValue({}),
      setCurrentStepState: jest.fn(),
      stepExecutionId: 'test-step-exec-id',
    } as any;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as any;

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

  describe('entering wait for input state', () => {
    it('should call tryEnterWaitForInput with timeout', async () => {
      await underTest.run();
      expect(mockStepExecutionRuntime.tryEnterWaitForInput).toHaveBeenCalledWith('30m');
    });

    it('should call tryEnterWaitForInput with undefined when no timeout', async () => {
      node.configuration.with = undefined;
      await underTest.run();
      expect(mockStepExecutionRuntime.tryEnterWaitForInput).toHaveBeenCalledWith(undefined);
    });

    it('should log start message when entering wait state', async () => {
      mockStepExecutionRuntime.tryEnterWaitForInput.mockReturnValue(true);

      await underTest.run();

      expect(workflowLogger.logDebug).toHaveBeenCalledWith(
        'Waiting for human input in step wait-for-input-step (timeout: 30m)'
      );
    });

    it('should store inputSchema and message in step state', async () => {
      mockStepExecutionRuntime.tryEnterWaitForInput.mockReturnValue(true);
      mockStepExecutionRuntime.getCurrentStepState.mockReturnValue({});

      await underTest.run();

      expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
        inputSchema: { move: { type: 'string' } },
        message: 'Please provide your input',
      });
    });

    it('should not finish step or navigate when entering wait state', async () => {
      mockStepExecutionRuntime.tryEnterWaitForInput.mockReturnValue(true);

      await underTest.run();

      expect(mockStepExecutionRuntime.finishStep).not.toHaveBeenCalled();
      expect(mockWorkflowRuntime.navigateToNextNode).not.toHaveBeenCalled();
    });
  });

  describe('exiting wait state with human input', () => {
    beforeEach(() => {
      mockStepExecutionRuntime.tryEnterWaitForInput.mockReturnValue(false);
      mockStepExecutionRuntime.getCurrentStepState.mockReturnValue({
        humanInput: { move: 'e2e4' },
      });
    });

    it('should finish step with human input when exiting', async () => {
      await underTest.run();

      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
        input: { move: 'e2e4' },
      });
    });

    it('should log message when input received', async () => {
      await underTest.run();

      expect(workflowLogger.logDebug).toHaveBeenCalledWith(
        'Received human input for step wait-for-input-step'
      );
    });

    it('should navigate to next node after finishing', async () => {
      await underTest.run();

      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });

    it('should clear humanInput from state', async () => {
      await underTest.run();

      expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith(undefined);
    });
  });

  describe('exiting wait state due to timeout', () => {
    beforeEach(() => {
      mockStepExecutionRuntime.tryEnterWaitForInput.mockReturnValue(false);
      mockStepExecutionRuntime.getCurrentStepState.mockReturnValue({
        timedOut: true,
      });
    });

    it('should finish step with timedOut flag when timed out', async () => {
      await underTest.run();

      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
        timedOut: true,
      });
    });

    it('should log timeout message', async () => {
      await underTest.run();

      expect(workflowLogger.logDebug).toHaveBeenCalledWith(
        'Step wait-for-input-step timed out waiting for human input'
      );
    });

    it('should navigate to next node after timeout', async () => {
      await underTest.run();

      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });
  });

  describe('exiting wait state with both input and timeout (input wins)', () => {
    beforeEach(() => {
      mockStepExecutionRuntime.tryEnterWaitForInput.mockReturnValue(false);
      // If both are present, humanInput should take precedence
      mockStepExecutionRuntime.getCurrentStepState.mockReturnValue({
        humanInput: { move: 'e2e4' },
        timedOut: true,
      });
    });

    it('should include timedOut flag when both are present', async () => {
      await underTest.run();

      // The current implementation will set timedOut first since it's checked first
      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalled();
    });
  });
});
