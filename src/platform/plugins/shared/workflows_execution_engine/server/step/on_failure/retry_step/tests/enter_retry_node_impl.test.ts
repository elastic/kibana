/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type { EnterRetryNode } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import type { StepExecutionRuntime } from '../../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../../workflow_event_logger';
import { EnterRetryNodeImpl } from '../enter_retry_node_impl';

describe('EnterRetryNodeImpl', () => {
  let underTest: EnterRetryNodeImpl;
  let node: EnterRetryNode;
  let stepExecutionRuntime: StepExecutionRuntime;
  let workflowRuntime: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;
  let fakeFailedContext: StepExecutionRuntime;
  let fakeFailedContextManager: jest.Mocked<StepExecutionRuntime['contextManager']>;
  let fakeStepExecutionDoc: Partial<EsWorkflowStepExecution>;

  beforeEach(() => {
    node = {
      id: 'retryStep1',
      type: 'enter-retry',
      stepId: 'retryStep1',
      stepType: 'retry',
      configuration: { 'max-attempts': 3 },
      exitNodeId: 'afterRetry',
    };
    stepExecutionRuntime = {
      getCurrentStepState: jest.fn(),
      startStep: jest.fn(),
      setCurrentStepState: jest.fn(),
      getCurrentStepResult: jest.fn(),
      failStep: jest.fn(),
      setWaitStep: jest.fn(),
    } as unknown as StepExecutionRuntime;
    workflowRuntime = {
      enterScope: jest.fn(),
      navigateToNextNode: jest.fn(),
      navigateToNode: jest.fn(),
      setWorkflowError: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;
    workflowLogger = {
      logDebug: jest.fn(),
      logError: jest.fn(),
    } as unknown as IWorkflowEventLogger;
    underTest = new EnterRetryNodeImpl(node, stepExecutionRuntime, workflowRuntime, workflowLogger);
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
      getCurrentStepResult: jest.fn(),
    } as unknown as StepExecutionRuntime;
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('run', () => {
    describe('when first time entering retry step', () => {
      beforeEach(() => {
        (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue(undefined);
      });

      it('should enter first attempt scope', async () => {
        await underTest.run();
        expect(workflowRuntime.enterScope).toHaveBeenCalledWith('1-attempt');
        expect(workflowRuntime.enterScope).toHaveBeenCalledTimes(1);
      });

      it('should start step', async () => {
        await underTest.run();
        expect(stepExecutionRuntime.startStep).toHaveBeenCalledWith();
      });

      it('should set attempt to 0 in step state', async () => {
        await underTest.run();
        expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({ attempt: 0 });
      });

      it('should go to next step', async () => {
        await underTest.run();
        expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
      });
    });

    describe('when re-entering retry step after a failure', () => {
      beforeEach(() => {
        (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({ attempt: 1 });
      });

      it('should enter next attempt scope', async () => {
        await underTest.run();
        expect(workflowRuntime.enterScope).toHaveBeenCalledWith('3-attempt');
        expect(workflowRuntime.enterScope).toHaveBeenCalledTimes(1);
      });

      it('should increment attempt in step state', async () => {
        await underTest.run();
        expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({ attempt: 2 });
      });

      it('should log debug message about retrying', async () => {
        await underTest.run();
        expect(workflowLogger.logDebug).toHaveBeenCalledWith(
          `Retrying "retryStep1" step. (attempt 2).`
        );
      });

      it('should go to next step', async () => {
        await underTest.run();
        expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
      });
    });

    describe('when re-entering retry step after a failure with delay configured', () => {
      beforeEach(() => {
        node.configuration.delay = '10s';
        (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({ attempt: 1 });
        stepExecutionRuntime.tryEnterDelay = jest.fn().mockReturnValue(true);
      });

      it('should call tryEnterDelay with configured delay', async () => {
        await underTest.run();
        expect(stepExecutionRuntime.tryEnterDelay).toHaveBeenCalledWith('10s');
      });

      it('should log debug message about delaying retry', async () => {
        await underTest.run();
        expect(workflowLogger.logDebug).toHaveBeenCalledWith(`Delaying retry for 10s.`);
      });

      it('should not increment attempt when entering delay', async () => {
        await underTest.run();
        expect(stepExecutionRuntime.setCurrentStepState).not.toHaveBeenCalled();
      });

      it('should not enter scope when entering delay', async () => {
        await underTest.run();
        expect(workflowRuntime.enterScope).not.toHaveBeenCalled();
      });

      it('should not navigate when entering delay', async () => {
        await underTest.run();
        expect(workflowRuntime.navigateToNextNode).not.toHaveBeenCalled();
      });
    });

    describe('when exiting delay period', () => {
      beforeEach(() => {
        node.configuration.delay = '10s';
        (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({ attempt: 1 });
        stepExecutionRuntime.tryEnterDelay = jest.fn().mockReturnValue(false);
      });

      it('should increment attempt in step state', async () => {
        await underTest.run();
        expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({ attempt: 2 });
      });

      it('should enter next attempt scope', async () => {
        await underTest.run();
        expect(workflowRuntime.enterScope).toHaveBeenCalledWith('3-attempt');
      });

      it('should log debug message about retrying', async () => {
        await underTest.run();
        expect(workflowLogger.logDebug).toHaveBeenCalledWith(
          `Retrying "retryStep1" step. (attempt 2).`
        );
      });

      it('should go to next step', async () => {
        await underTest.run();
        expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
      });
    });
  });

  describe('catchError', () => {
    beforeEach(() => {
      (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({ attempt: 2 });
      (fakeFailedContext.getCurrentStepResult as jest.Mock).mockReturnValue({
        error: new ExecutionError({
          type: 'NetworkError',
          message: 'Failed to connect to server',
        }),
      });
    });

    describe('when attempts exceed max limit', () => {
      beforeEach(() => {
        (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({ attempt: 3 });
      });

      it('should fail the step with appropriate error', async () => {
        await underTest.catchError(fakeFailedContext);
        expect(stepExecutionRuntime.failStep).toHaveBeenCalledWith(
          new ExecutionError({
            type: 'NetworkError',
            message: 'Failed to connect to server',
          })
        );
      });
    });

    describe('no delay configured', () => {
      describe('when attempts are within max limit', () => {
        beforeEach(() => {
          (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({ attempt: 2 });
        });

        it('should clear workflow error', async () => {
          await underTest.catchError(fakeFailedContext);
          expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(undefined);
          expect(workflowRuntime.setWorkflowError).toHaveBeenCalledTimes(1);
        });

        it('should go to retry step again', async () => {
          await underTest.catchError(fakeFailedContext);
          expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith(node.id);
        });
      });
    });

    describe('delay configured', () => {
      beforeEach(() => {
        node.configuration.delay = '5s';
      });

      it('should clear workflow error', async () => {
        await underTest.catchError(fakeFailedContext);
        expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(undefined);
        expect(workflowRuntime.setWorkflowError).toHaveBeenCalledTimes(1);
      });

      it('should go to retry step again', async () => {
        await underTest.catchError(fakeFailedContext);
        expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith(node.id);
      });
    });

    describe('condition configured', () => {
      beforeEach(() => {
        node.configuration.condition = '{{error.type}} == "NetworkError"';
      });

      describe('when condition are not met', () => {
        beforeEach(() => {
          fakeFailedContextManager.evaluateBooleanExpressionInContext.mockReturnValue(false);
        });

        it('should call evaluateBooleanExpressionInContext with correct parameters', async () => {
          await underTest.catchError(fakeFailedContext);
          const fakeError = new ExecutionError({
            type: 'NetworkError',
            message: 'Failed to connect to server',
          });
          fakeStepExecutionDoc.error = fakeError;
          expect(fakeFailedContextManager.evaluateBooleanExpressionInContext).toHaveBeenCalledWith(
            node.configuration.condition,
            {
              error: fakeError,
            }
          );
        });

        it('should log debug message about condition not met', async () => {
          await underTest.catchError(fakeFailedContext);
          expect(workflowLogger.logDebug).toHaveBeenCalledWith(
            `Condition for retry step not met, propagating error.`
          );
        });

        it('should clear workflow error', async () => {
          await underTest.catchError(fakeFailedContext);
          expect(workflowRuntime.setWorkflowError).not.toHaveBeenCalledWith();
        });

        it('should not navigate to anywhere', async () => {
          await underTest.catchError(fakeFailedContext);
          expect(workflowRuntime.navigateToNode).not.toHaveBeenCalledWith();
          expect(workflowRuntime.navigateToNextNode).not.toHaveBeenCalledWith();
        });
      });
    });
  });
});
