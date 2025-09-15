/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { EnterRetryNode } from '@kbn/workflows';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterRetryNodeImpl } from '../enter_retry_node_impl';
import type { IWorkflowEventLogger } from '../../../../workflow_event_logger/workflow_event_logger';
import type { WorkflowTaskManager } from '../../../../workflow_task_manager/workflow_task_manager';

describe('EnterRetryNodeImpl', () => {
  let underTest: EnterRetryNodeImpl;
  let node: EnterRetryNode;
  let workflowRuntime: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;
  let workflowTaskManager: WorkflowTaskManager;

  beforeEach(() => {
    node = {
      id: 'retryStep1',
      type: 'enter-retry',
      stepId: 'retryStep1',
      stepType: 'retry',
      configuration: { 'max-attempts': 3 },
      exitNodeId: 'afterRetry',
    };
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowTaskManager = {} as unknown as WorkflowTaskManager;
    workflowLogger.logDebug = jest.fn();
    workflowLogger.logError = jest.fn();
    underTest = new EnterRetryNodeImpl(node, workflowRuntime, workflowTaskManager, workflowLogger);
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
        workflowRuntime.getCurrentStepState = jest.fn().mockReturnValue(undefined);
        workflowRuntime.enterScope = jest.fn();
        workflowRuntime.startStep = jest.fn();
        workflowRuntime.setCurrentStepState = jest.fn();
        workflowRuntime.navigateToNextNode = jest.fn();
      });

      it('should enter whole retry step scope', async () => {
        await underTest.run();
        expect(workflowRuntime.enterScope).toHaveBeenCalledWith();
      });

      it('should enter first attempt scope', async () => {
        await underTest.run();
        expect(workflowRuntime.enterScope).toHaveBeenCalledWith('1-attempt');
      });

      it('should enter scopes in correct order', async () => {
        await underTest.run();
        expect(workflowRuntime.enterScope).toHaveBeenNthCalledWith(1);
        expect(workflowRuntime.enterScope).toHaveBeenNthCalledWith(2, '1-attempt');
      });

      it('should enter two scopes', async () => {
        await underTest.run();
        expect(workflowRuntime.enterScope).toHaveBeenCalledTimes(2);
      });

      it('should start step', async () => {
        await underTest.run();
        expect(workflowRuntime.startStep).toHaveBeenCalledWith();
      });

      it('should set attempt to 0 in step state', async () => {
        await underTest.run();
        expect(workflowRuntime.setCurrentStepState).toHaveBeenCalledWith({ attempt: 0 });
      });

      it('should go to next step', async () => {
        await underTest.run();
        expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
      });
    });

    describe('when re-entering retry step after a failure', () => {
      beforeEach(() => {
        workflowRuntime.getCurrentStepState = jest.fn().mockReturnValue({ attempt: 1 });
        workflowRuntime.enterScope = jest.fn();
        workflowRuntime.setCurrentStepState = jest.fn();
        workflowRuntime.navigateToNextNode = jest.fn();
      });

      it('should enter next attempt scope', async () => {
        await underTest.run();
        expect(workflowRuntime.enterScope).toHaveBeenCalledWith('3-attempt');
        expect(workflowRuntime.enterScope).toHaveBeenCalledTimes(1);
      });

      it('should increment attempt in step state', async () => {
        await underTest.run();
        expect(workflowRuntime.setCurrentStepState).toHaveBeenCalledWith({ attempt: 2 });
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
      workflowRuntime.getCurrentStepState = jest.fn().mockReturnValue({ attempt: 2 });
      workflowRuntime.navigateToNode = jest.fn();
    });

    describe('when attempts exceed max limit', () => {
      beforeEach(() => {
        workflowRuntime.getCurrentStepState = jest.fn().mockReturnValue({ attempt: 3 });
        workflowRuntime.failStep = jest.fn();
        workflowRuntime.setWorkflowError = jest.fn();
      });

      it('should fail the step with appropriate error', async () => {
        await underTest.catchError();
        expect(workflowRuntime.failStep).toHaveBeenCalledWith(
          new Error('Retry step "retryStep1" has exceeded the maximum number of attempts.')
        );
      });
    });

    describe('no delay configured', () => {
      describe('when attempts are within max limit', () => {
        beforeEach(() => {
          workflowRuntime.getCurrentStepState = jest.fn().mockReturnValue({ attempt: 2 });
          workflowRuntime.navigateToNode = jest.fn();
          workflowRuntime.setWorkflowError = jest.fn();
        });

        it('should clear workflow error', async () => {
          await underTest.catchError();
          expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(undefined);
          expect(workflowRuntime.setWorkflowError).toHaveBeenCalledTimes(1);
        });

        it('should go to retry step again', async () => {
          await underTest.catchError();
          expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith(node.id);
        });
      });
    });

    describe('delay configured', () => {
      describe('long delay configured', () => {
        beforeEach(() => {
          node.configuration.delay = '6s';
          workflowTaskManager.scheduleResumeTask = jest.fn().mockResolvedValue({
            taskId: 'fake-task-id',
          });
          workflowRuntime.setWaitStep = jest.fn();
          workflowRuntime.setWorkflowError = jest.fn();
          workflowRuntime.getWorkflowExecution = jest.fn().mockReturnValue({
            id: 'fake-execution-1',
            spaceId: 'fake-space-1',
          });
          workflowRuntime.setCurrentStepState = jest.fn();
        });

        it('should clear workflow error', async () => {
          await underTest.catchError();
          expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(undefined);
          expect(workflowRuntime.setWorkflowError).toHaveBeenCalledTimes(1);
        });

        it('should set step to wait status', async () => {
          await underTest.catchError();
          expect(workflowRuntime.setWaitStep).toHaveBeenCalledWith();
        });

        it('should schedule resume task of current execution', async () => {
          await underTest.catchError();
          expect(workflowTaskManager.scheduleResumeTask).toHaveBeenCalledWith(
            expect.objectContaining({
              workflowRunId: 'fake-execution-1',
              spaceId: 'fake-space-1',
            })
          );
        });

        it('should schedule resume task with runAt equal now() + delay', async () => {
          await underTest.catchError();
          expect(workflowTaskManager.scheduleResumeTask).toHaveBeenCalledWith(
            expect.objectContaining({
              runAt: new Date(new Date().getTime() + 6000),
            })
          );
        });

        it('should update state with task id with preserving previous state', async () => {
          workflowRuntime.getCurrentStepState = jest.fn().mockReturnValue({
            attempt: 1,
          });
          await underTest.catchError();
          expect(workflowRuntime.setCurrentStepState).toHaveBeenCalledWith({
            attempt: 1,
            resumeExecutionTaskId: 'fake-task-id',
          });
        });
      });

      describe('short delay configured', () => {
        beforeEach(() => {
          node.configuration.delay = '5s';
          workflowRuntime.navigateToNode = jest.fn();
          workflowRuntime.setWorkflowError = jest.fn();
        });

        it('should clear workflow error', async () => {
          const runPromise = underTest.catchError();
          await jest.advanceTimersByTimeAsync(0);
          await jest.advanceTimersByTimeAsync(5000);
          await runPromise;
          expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(undefined);
          expect(workflowRuntime.setWorkflowError).toHaveBeenCalledTimes(1);
        });

        it('should wait for provided delay and then go to retry step', async () => {
          const runPromise = underTest.catchError();
          await jest.advanceTimersByTimeAsync(0);
          await jest.advanceTimersByTimeAsync(5000);
          await runPromise;

          expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith(node.id);
        });
      });
    });
  });
});
