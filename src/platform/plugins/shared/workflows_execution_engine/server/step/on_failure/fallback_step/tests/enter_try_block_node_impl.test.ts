/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterTryBlockNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../../workflow_event_logger';
import { EnterTryBlockNodeImpl } from '../enter_try_block_node_impl';

describe('EnterTryBlockNodeImpl', () => {
  let underTest: EnterTryBlockNodeImpl;
  let node: EnterTryBlockNode;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let mockStepLogger: jest.Mocked<IWorkflowEventLogger>;

  beforeEach(() => {
    node = {
      id: 'onFailureZone1',
      type: 'enter-try-block',
      stepId: 'onFailureZone1',
      stepType: 'on-failure',
      enterNormalPathNodeId: 'enterNormalPath1',
      enterFallbackPathNodeId: 'enterFallbackPath1',
      exitNodeId: 'exitOnFailureZone1',
    };

    mockStepLogger = {
      logError: jest.fn(),
    } as any;

    mockStepExecutionRuntime = {
      startStep: jest.fn().mockResolvedValue(undefined),
      getCurrentStepState: jest.fn(),
      setCurrentStepState: jest.fn().mockResolvedValue(undefined),
      stepLogger: mockStepLogger,
    } as any;

    mockWorkflowRuntime = {
      navigateToNode: jest.fn(),
      getWorkflowExecution: jest.fn(),
      setWorkflowError: jest.fn(),
    } as any;

    underTest = new EnterTryBlockNodeImpl(node, mockStepExecutionRuntime, mockWorkflowRuntime);
  });

  describe('run', () => {
    it('should start the step with correct node id', async () => {
      await underTest.run();
      expect(mockStepExecutionRuntime.startStep).toHaveBeenCalledWith();
    });

    it('should go to normal path entry node', async () => {
      await underTest.run();
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith(node.enterNormalPathNodeId);
    });

    it('should execute steps in correct order', async () => {
      const calls: string[] = [];
      mockStepExecutionRuntime.startStep = jest.fn().mockImplementation(() => {
        calls.push('startStep');
        return Promise.resolve();
      });
      mockWorkflowRuntime.navigateToNode = jest.fn().mockImplementation(() => {
        calls.push('goToStep');
      });

      await underTest.run();

      expect(calls).toEqual(['startStep', 'goToStep']);
    });
  });

  describe('catchError', () => {
    const mockWorkflowError = new Error('Workflow execution error');

    beforeEach(() => {
      mockWorkflowRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
        error: mockWorkflowError,
      });
    });

    describe('when fallback has not been executed yet', () => {
      beforeEach(() => {
        mockStepExecutionRuntime.getCurrentStepState = jest.fn().mockReturnValue({});
      });

      it('should log error message', async () => {
        await underTest.catchError();
        expect(mockStepLogger.logError).toHaveBeenCalledWith(
          'Error caught by the OnFailure zone. Redirecting to the fallback path'
        );
      });

      it('should get current step state', async () => {
        await underTest.catchError();
        expect(mockStepExecutionRuntime.getCurrentStepState).toHaveBeenCalledWith();
      });

      it('should set step state with isFallbackExecuted flag and error', async () => {
        await underTest.catchError();
        expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
          isFallbackExecuted: true,
          error: mockWorkflowError,
        });
      });

      it('should clear workflow error', async () => {
        await underTest.catchError();
        expect(mockWorkflowRuntime.setWorkflowError).toHaveBeenCalledWith(undefined);
      });

      it('should navigate to fallback path node', async () => {
        await underTest.catchError();
        expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith(
          node.enterFallbackPathNodeId
        );
      });

      it('should execute operations in correct order', async () => {
        const calls: string[] = [];
        mockStepLogger.logError = jest.fn().mockImplementation(() => {
          calls.push('logError');
        });
        mockStepExecutionRuntime.getCurrentStepState = jest.fn().mockImplementation(() => {
          calls.push('getCurrentStepState');
          return {};
        });
        mockStepExecutionRuntime.setCurrentStepState = jest.fn().mockImplementation(() => {
          calls.push('setCurrentStepState');
          return Promise.resolve();
        });
        mockWorkflowRuntime.setWorkflowError = jest.fn().mockImplementation(() => {
          calls.push('setWorkflowError');
        });
        mockWorkflowRuntime.navigateToNode = jest.fn().mockImplementation(() => {
          calls.push('navigateToNode');
        });

        await underTest.catchError();

        expect(calls).toEqual([
          'logError',
          'getCurrentStepState',
          'setCurrentStepState',
          'setWorkflowError',
          'navigateToNode',
        ]);
      });

      it('should preserve existing step state properties', async () => {
        const existingState = {
          customProperty: 'value',
          anotherProperty: 123,
        };
        mockStepExecutionRuntime.getCurrentStepState = jest.fn().mockReturnValue(existingState);

        await underTest.catchError();

        expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
          customProperty: 'value',
          anotherProperty: 123,
          isFallbackExecuted: true,
          error: mockWorkflowError,
        });
      });
    });

    describe('when step state is null or undefined', () => {
      beforeEach(() => {
        mockStepExecutionRuntime.getCurrentStepState = jest.fn().mockReturnValue(null);
      });

      it('should handle null step state gracefully', async () => {
        await underTest.catchError();
        expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
          isFallbackExecuted: true,
          error: mockWorkflowError,
        });
      });

      it('should still navigate to fallback path', async () => {
        await underTest.catchError();
        expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith(
          node.enterFallbackPathNodeId
        );
      });
    });

    describe('when fallback has already been executed', () => {
      beforeEach(() => {
        mockStepExecutionRuntime.getCurrentStepState = jest.fn().mockReturnValue({
          isFallbackExecuted: true,
        });
      });

      it('should log error message', async () => {
        await underTest.catchError();
        expect(mockStepLogger.logError).toHaveBeenCalledWith(
          'Error caught by the OnFailure zone. Redirecting to the fallback path'
        );
      });

      it('should get current step state', async () => {
        await underTest.catchError();
        expect(mockStepExecutionRuntime.getCurrentStepState).toHaveBeenCalledWith();
      });

      it('should not set step state again', async () => {
        await underTest.catchError();
        expect(mockStepExecutionRuntime.setCurrentStepState).not.toHaveBeenCalled();
      });

      it('should not clear workflow error', async () => {
        await underTest.catchError();
        expect(mockWorkflowRuntime.setWorkflowError).not.toHaveBeenCalled();
      });

      it('should not navigate to fallback path again', async () => {
        await underTest.catchError();
        expect(mockWorkflowRuntime.navigateToNode).not.toHaveBeenCalled();
      });
    });

    describe('when fallback flag is explicitly false', () => {
      beforeEach(() => {
        mockStepExecutionRuntime.getCurrentStepState = jest.fn().mockReturnValue({
          isFallbackExecuted: false,
          someOtherData: 'test',
        });
      });

      it('should execute fallback path', async () => {
        await underTest.catchError();
        expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith(
          node.enterFallbackPathNodeId
        );
      });

      it('should preserve other state properties', async () => {
        await underTest.catchError();
        expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
          isFallbackExecuted: true,
          someOtherData: 'test',
          error: mockWorkflowError,
        });
      });
    });
  });
});
