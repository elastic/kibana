/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepExecutionRuntime } from '../../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { ExitTryBlockNodeImpl } from '../exit_try_block_node_impl';

describe('ExitTryBlockNodeImpl', () => {
  let underTest: ExitTryBlockNodeImpl;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;

  beforeEach(() => {
    mockStepExecutionRuntime = {
      getCurrentStepState: jest.fn(),
      failStep: jest.fn().mockResolvedValue(undefined),
      finishStep: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockWorkflowRuntime = {
      setWorkflowError: jest.fn(),
      navigateToNextNode: jest.fn(),
    } as any;

    underTest = new ExitTryBlockNodeImpl(mockStepExecutionRuntime, mockWorkflowRuntime);
  });

  describe('run', () => {
    describe('when there is an error in step state', () => {
      const mockError = new Error('Test error');

      beforeEach(() => {
        mockStepExecutionRuntime.getCurrentStepState = jest.fn().mockReturnValue({
          error: mockError,
        });
      });

      it('should get step state for enter node', async () => {
        await underTest.run();
        expect(mockStepExecutionRuntime.getCurrentStepState).toHaveBeenCalledWith();
      });

      it('should fail the step with the stored error', async () => {
        await underTest.run();
        expect(mockStepExecutionRuntime.failStep).toHaveBeenCalledWith(mockError);
      });

      it('should set workflow error with the stored error', async () => {
        await underTest.run();
        expect(mockWorkflowRuntime.setWorkflowError).toHaveBeenCalledWith(mockError);
      });

      it('should not finish step when there is an error', async () => {
        await underTest.run();
        expect(mockStepExecutionRuntime.finishStep).not.toHaveBeenCalled();
      });

      it('should not go to next step when there is an error', async () => {
        await underTest.run();
        expect(mockWorkflowRuntime.navigateToNextNode).not.toHaveBeenCalled();
      });
    });

    describe('when there is no error in step state', () => {
      beforeEach(() => {
        mockStepExecutionRuntime.getCurrentStepState = jest.fn().mockReturnValue({});
      });

      it('should get step state for enter node', async () => {
        await underTest.run();
        expect(mockStepExecutionRuntime.getCurrentStepState).toHaveBeenCalledWith();
      });

      it('should finish the step', async () => {
        await underTest.run();
        expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith();
      });

      it('should go to next step', async () => {
        await underTest.run();
        expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
      });

      it('should not fail step when there is no error', async () => {
        await underTest.run();
        expect(mockStepExecutionRuntime.failStep).not.toHaveBeenCalled();
      });

      it('should not set workflow error when there is no error', async () => {
        await underTest.run();
        expect(mockWorkflowRuntime.setWorkflowError).not.toHaveBeenCalled();
      });
    });

    describe('when step state is null/undefined', () => {
      beforeEach(() => {
        mockStepExecutionRuntime.getCurrentStepState = jest.fn().mockReturnValue(null);
      });

      it('should handle null step state gracefully', async () => {
        await underTest.run();
        expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith();
        expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
      });
    });
  });
});
