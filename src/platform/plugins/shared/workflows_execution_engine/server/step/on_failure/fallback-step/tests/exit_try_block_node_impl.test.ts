/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitTryBlockNode } from '@kbn/workflows';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { ExitTryBlockNodeImpl } from '../exit_try_block_node_impl';

describe('ExitTryBlockNodeImpl', () => {
  let underTest: ExitTryBlockNodeImpl;
  let step: ExitTryBlockNode;
  let workflowRuntime: WorkflowExecutionRuntimeManager;

  beforeEach(() => {
    step = {
      id: 'exitOnFailureZone1',
      type: 'exit-try-block',
      enterNodeId: 'onFailureZone1',
    };
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowRuntime.getStepState = jest.fn();
    workflowRuntime.failStep = jest.fn();
    workflowRuntime.setWorkflowError = jest.fn();
    workflowRuntime.finishStep = jest.fn();
    workflowRuntime.exitScope = jest.fn();
    workflowRuntime.goToNextStep = jest.fn();

    underTest = new ExitTryBlockNodeImpl(step, workflowRuntime);
  });

  describe('run', () => {
    describe('when there is an error in step state', () => {
      const mockError = new Error('Test error');

      beforeEach(() => {
        workflowRuntime.getStepState = jest.fn().mockReturnValue({
          error: mockError,
        });
      });

      it('should get step state for enter node', async () => {
        await underTest.run();
        expect(workflowRuntime.getStepState).toHaveBeenCalledWith(step.enterNodeId);
      });

      it('should fail the step with the stored error', async () => {
        await underTest.run();
        expect(workflowRuntime.failStep).toHaveBeenCalledWith(step.enterNodeId, mockError);
      });

      it('should set workflow error with the stored error', async () => {
        await underTest.run();
        expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(mockError);
      });

      it('should not finish step when there is an error', async () => {
        await underTest.run();
        expect(workflowRuntime.finishStep).not.toHaveBeenCalled();
      });

      it('should not exit scope when there is an error', async () => {
        await underTest.run();
        expect(workflowRuntime.exitScope).not.toHaveBeenCalled();
      });

      it('should not go to next step when there is an error', async () => {
        await underTest.run();
        expect(workflowRuntime.goToNextStep).not.toHaveBeenCalled();
      });
    });

    describe('when there is no error in step state', () => {
      beforeEach(() => {
        workflowRuntime.getStepState = jest.fn().mockReturnValue({});
      });

      it('should get step state for enter node', async () => {
        await underTest.run();
        expect(workflowRuntime.getStepState).toHaveBeenCalledWith(step.enterNodeId);
      });

      it('should finish the step', async () => {
        await underTest.run();
        expect(workflowRuntime.finishStep).toHaveBeenCalledWith(step.enterNodeId);
      });

      it('should exit scope', async () => {
        await underTest.run();
        expect(workflowRuntime.exitScope).toHaveBeenCalled();
      });

      it('should go to next step', async () => {
        await underTest.run();
        expect(workflowRuntime.goToNextStep).toHaveBeenCalled();
      });

      it('should not fail step when there is no error', async () => {
        await underTest.run();
        expect(workflowRuntime.failStep).not.toHaveBeenCalled();
      });

      it('should not set workflow error when there is no error', async () => {
        await underTest.run();
        expect(workflowRuntime.setWorkflowError).not.toHaveBeenCalled();
      });
    });

    describe('when step state is null/undefined', () => {
      beforeEach(() => {
        workflowRuntime.getStepState = jest.fn().mockReturnValue(null);
      });

      it('should handle null step state gracefully', async () => {
        await underTest.run();
        expect(workflowRuntime.finishStep).toHaveBeenCalledWith(step.enterNodeId);
        expect(workflowRuntime.exitScope).toHaveBeenCalled();
        expect(workflowRuntime.goToNextStep).toHaveBeenCalled();
      });
    });
  });
});
