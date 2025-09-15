/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterNormalPathNode } from '@kbn/workflows';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../../workflow_event_logger/workflow_event_logger';
import { EnterNormalPathNodeImpl } from '../enter_normal_path_node_impl';

describe('EnterNormalPathNodeImpl', () => {
  let underTest: EnterNormalPathNodeImpl;
  let node: EnterNormalPathNode;
  let workflowRuntime: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;

  beforeEach(() => {
    node = {
      id: 'enterNormalPath1',
      type: 'enter-normal-path',
      stepId: 'enterNormalPath1',
      stepType: 'on-failure',
      enterZoneNodeId: 'onFailureZone1',
      enterFailurePathNodeId: 'enterFailurePath1',
    };
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowRuntime.enterScope = jest.fn();
    workflowRuntime.navigateToNextNode = jest.fn();
    workflowRuntime.getCurrentStepState = jest.fn();
    workflowRuntime.setCurrentStepState = jest.fn();
    workflowRuntime.setWorkflowError = jest.fn();
    workflowRuntime.navigateToNode = jest.fn();
    workflowRuntime.getWorkflowExecution = jest.fn();

    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logError = jest.fn();

    underTest = new EnterNormalPathNodeImpl(node, workflowRuntime, workflowLogger);
  });

  describe('run', () => {
    it('should enter scope', async () => {
      await underTest.run();
      expect(workflowRuntime.enterScope).toHaveBeenCalled();
    });

    it('should go to next step', async () => {
      await underTest.run();
      expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });
  });

  describe('catchError', () => {
    const mockWorkflowError = new Error('Workflow execution error');

    beforeEach(() => {
      workflowRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
        error: mockWorkflowError,
      });
    });

    describe('when no error exists in step state', () => {
      beforeEach(() => {
        workflowRuntime.getCurrentStepState = jest.fn().mockReturnValue({});
      });

      it('should log error message', async () => {
        await underTest.catchError();
        expect(workflowLogger.logError).toHaveBeenCalledWith(
          'Error caught by the OnFailure zone. Redirecting to the fallback path'
        );
      });

      it('should get step state for current node', async () => {
        await underTest.catchError();
        expect(workflowRuntime.getCurrentStepState).toHaveBeenCalledWith();
      });

      it('should set step state with error on enter zone node', async () => {
        await underTest.catchError();
        expect(workflowRuntime.setCurrentStepState).toHaveBeenCalledWith({
          error: mockWorkflowError,
        });
      });

      it('should clear workflow error', async () => {
        await underTest.catchError();
        expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(undefined);
      });

      it('should redirect to failure path', async () => {
        await underTest.catchError();
        expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith(node.enterFailurePathNodeId);
      });
    });

    describe('when step state is null/undefined', () => {
      beforeEach(() => {
        workflowRuntime.getCurrentStepState = jest.fn().mockReturnValue(null);
      });

      it('should handle null step state gracefully', async () => {
        await underTest.catchError();
        expect(workflowRuntime.setCurrentStepState).toHaveBeenCalledWith({
          error: mockWorkflowError,
        });
      });
    });
  });
});
