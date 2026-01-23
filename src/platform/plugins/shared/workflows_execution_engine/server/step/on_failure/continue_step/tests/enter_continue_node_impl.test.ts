/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterContinueNode } from '@kbn/workflows/graph';
import type { EsWorkflowStepExecution } from '@kbn/workflows/types/v1';
import type { StepExecutionRuntime } from '../../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../../workflow_event_logger';
import { EnterContinueNodeImpl } from '../enter_continue_node_impl';

describe('EnterContinueNodeImpl', () => {
  let underTest: EnterContinueNodeImpl;
  let node: EnterContinueNode;
  let workflowRuntime: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;
  let fakeFailedContext: StepExecutionRuntime;
  let fakeFailedContextManager: jest.Mocked<StepExecutionRuntime['contextManager']>;
  let fakeStepExecutionDoc: Partial<EsWorkflowStepExecution>;

  beforeEach(() => {
    node = {
      id: 'continueStep1',
      type: 'enter-continue',
      stepId: 'continueStep1',
      stepType: 'continue',
      configuration: {
        condition: '${{error.type == "NetworkError"}}',
      },
      exitNodeId: 'exitContinue(continueStep1)',
    };
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logDebug = jest.fn();
    workflowLogger.logError = jest.fn();
    underTest = new EnterContinueNodeImpl(node, workflowRuntime, workflowLogger);
    fakeStepExecutionDoc = {
      id: 'stepExec1',
      stepId: 'someStep',
      error: {
        type: 'NetworkError',
        message: 'Failed to connect to server',
      },
    };

    fakeFailedContextManager = jest.mocked({
      evaluateBooleanExpressionInContext: jest.fn(),
    } as unknown as StepExecutionRuntime['contextManager']);
    fakeFailedContextManager.evaluateBooleanExpressionInContext.mockReturnValue(true);
    fakeFailedContext = {
      stepExecution: fakeStepExecutionDoc,
      contextManager: fakeFailedContextManager,
    } as unknown as StepExecutionRuntime;
  });

  describe('run', () => {
    beforeEach(() => {
      workflowRuntime.navigateToNextNode = jest.fn();
    });

    it('should go to next node', async () => {
      await underTest.run();
      expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });
  });

  describe('catchError', () => {
    beforeEach(() => {
      workflowRuntime.navigateToNode = jest.fn();
      workflowRuntime.setWorkflowError = jest.fn();
    });

    describe('when condition is not met', () => {
      beforeEach(() => {
        fakeFailedContextManager.evaluateBooleanExpressionInContext.mockReturnValue(false);
      });

      it('should call evaluateBooleanExpressionInContext with correct parameters', async () => {
        await underTest.catchError(fakeFailedContext);
        expect(fakeFailedContextManager.evaluateBooleanExpressionInContext).toHaveBeenCalledWith(
          node.configuration.condition,
          {
            error: fakeFailedContext.stepExecution?.error,
          }
        );
      });

      it('should not clear workflow error', async () => {
        await underTest.catchError(fakeFailedContext);
        expect(workflowRuntime.setWorkflowError).not.toHaveBeenCalled();
      });

      it('should log debug message about condition not met', async () => {
        await underTest.catchError(fakeFailedContext);
        expect(workflowLogger.logDebug).toHaveBeenCalledWith(
          `Condition for continue step not met, propagating error.`
        );
      });

      it('should not navigate to exit continue node', async () => {
        await underTest.catchError(fakeFailedContext);
        expect(workflowRuntime.navigateToNode).not.toHaveBeenCalled();
      });
    });

    describe('when condition is met', () => {
      beforeEach(() => {
        fakeFailedContextManager.evaluateBooleanExpressionInContext.mockReturnValue(true);
      });

      it('should log debug message about error caught', async () => {
        await underTest.catchError(fakeFailedContext);
        expect(workflowLogger.logDebug).toHaveBeenCalledWith(`Error caught, continuing execution.`);
      });

      it('should go to exit continue node', async () => {
        await underTest.catchError(fakeFailedContext);
        expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith(node.exitNodeId);
      });

      it('should clear workflow error', async () => {
        await underTest.catchError(fakeFailedContext);
        expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(undefined);
      });
    });
  });
});
