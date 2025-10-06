/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterNormalPathNode } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { StepExecutionRuntime } from '../../../../workflow_context_manager/step_execution_runtime';
import type { IWorkflowEventLogger } from '../../../../workflow_event_logger/workflow_event_logger';
import { EnterNormalPathNodeImpl } from '../enter_normal_path_node_impl';

describe('EnterNormalPathNodeImpl', () => {
  let underTest: EnterNormalPathNodeImpl;
  let node: EnterNormalPathNode;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
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

    mockStepExecutionRuntime = {
      getCurrentStepState: jest.fn(),
      setCurrentStepState: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
      setWorkflowError: jest.fn(),
      navigateToNode: jest.fn(),
      getWorkflowExecution: jest.fn(),
    } as any;

    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logError = jest.fn();

    underTest = new EnterNormalPathNodeImpl(
      node,
      mockStepExecutionRuntime,
      mockWorkflowRuntime,
      workflowLogger
    );
  });

  describe('run', () => {
    it('should go to next step', async () => {
      await underTest.run();
      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });
  });

  describe('catchError', () => {
    const mockWorkflowError = new Error('Workflow execution error');

    beforeEach(() => {
      mockWorkflowRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
        error: mockWorkflowError,
      });
    });

    describe('when no error exists in step state', () => {
      beforeEach(() => {
        mockStepExecutionRuntime.getCurrentStepState = jest.fn().mockReturnValue({});
      });

      it('should log error message', async () => {
        await underTest.catchError();
        expect(workflowLogger.logError).toHaveBeenCalledWith(
          'Error caught by the OnFailure zone. Redirecting to the fallback path'
        );
      });

      it('should get step state for current node', async () => {
        await underTest.catchError();
        expect(mockStepExecutionRuntime.getCurrentStepState).toHaveBeenCalledWith();
      });

      it('should set step state with error on enter zone node', async () => {
        await underTest.catchError();
        expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
          error: mockWorkflowError,
        });
      });

      it('should clear workflow error', async () => {
        await underTest.catchError();
        expect(mockWorkflowRuntime.setWorkflowError).toHaveBeenCalledWith(undefined);
      });

      it('should redirect to failure path', async () => {
        await underTest.catchError();
        expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith(
          node.enterFailurePathNodeId
        );
      });
    });

    describe('when step state is null/undefined', () => {
      beforeEach(() => {
        mockStepExecutionRuntime.getCurrentStepState = jest.fn().mockReturnValue(null);
      });

      it('should handle null step state gracefully', async () => {
        await underTest.catchError();
        expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
          error: mockWorkflowError,
        });
      });
    });
  });
});
