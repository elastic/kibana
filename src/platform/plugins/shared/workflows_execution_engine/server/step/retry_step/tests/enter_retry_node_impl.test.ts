/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { EnterRetryNode } from '@kbn/workflows';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterRetryNodeImpl } from '../enter_retry_node_impl';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger/workflow_event_logger';

describe('EnterRetryNodeImpl', () => {
  let underTest: EnterRetryNodeImpl;
  let step: EnterRetryNode;
  let workflowRuntime: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;

  beforeEach(() => {
    step = {
      id: 'retryStep1',
      type: 'enter-retry',
      configuration: { 'max-attempts': 3, delay: 0 },
      exitNodeId: 'afterRetry',
    };
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logDebug = jest.fn();
    workflowLogger.logError = jest.fn();
    underTest = new EnterRetryNodeImpl(step, workflowRuntime, workflowLogger);
  });

  describe('run', () => {
    describe('when first time entering retry step', () => {
      beforeEach(() => {
        workflowRuntime.getStepState = jest.fn().mockReturnValue(undefined);
        workflowRuntime.enterScope = jest.fn();
        workflowRuntime.startStep = jest.fn();
        workflowRuntime.setStepState = jest.fn();
        workflowRuntime.goToNextStep = jest.fn();
      });

      it('should enter scope', async () => {
        await underTest.run();
        expect(workflowRuntime.enterScope).toHaveBeenCalled();
      });

      it('should start step', async () => {
        await underTest.run();
        expect(workflowRuntime.startStep).toHaveBeenCalledWith(step.id);
      });

      it('should set attempt to 1 in step state', async () => {
        await underTest.run();
        expect(workflowRuntime.setStepState).toHaveBeenCalledWith(step.id, { attempt: 1 });
      });

      it('should go to next step', async () => {
        await underTest.run();
        expect(workflowRuntime.goToNextStep).toHaveBeenCalled();
      });
    });

    describe('when re-entering retry step after a failure', () => {
      beforeEach(() => {
        workflowRuntime.getStepState = jest.fn().mockReturnValue({ attempt: 1 });
        workflowRuntime.enterScope = jest.fn();
        workflowRuntime.setStepState = jest.fn();
        workflowRuntime.goToNextStep = jest.fn();
      });

      it('should enter scope', async () => {
        await underTest.run();
        expect(workflowRuntime.enterScope).toHaveBeenCalled();
      });

      it('should increment attempt in step state', async () => {
        await underTest.run();
        expect(workflowRuntime.setStepState).toHaveBeenCalledWith(step.id, { attempt: 2 });
      });

      it('should log debug message about retrying', async () => {
        await underTest.run();
        expect(workflowLogger.logDebug).toHaveBeenCalledWith(
          `Child step. Retrying the chain of steps for retry step "retryStep1" (attempt 2).`
        );
      });

      it('should go to next step', async () => {
        await underTest.run();
        expect(workflowRuntime.goToNextStep).toHaveBeenCalled();
      });
    });
  });

  describe('catchError', () => {
    beforeEach(() => {
      workflowRuntime.getStepState = jest.fn().mockReturnValue({ attempt: 2 });
      workflowRuntime.goToStep = jest.fn();
    });

    describe('when attempts are within max limit', () => {
      beforeEach(() => {
        workflowRuntime.getStepState = jest.fn().mockReturnValue({ attempt: 2 });
        workflowRuntime.goToStep = jest.fn();
        workflowRuntime.setWorkflowError = jest.fn();
      });

      it('should clear workflow error', async () => {
        await underTest.catchError();
        expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(undefined);
      });

      it('should go to retry step again', async () => {
        await underTest.catchError();
        expect(workflowRuntime.goToStep).toHaveBeenCalledWith(step.id);
      });
    });

    describe('when attempts exceed max limit', () => {
      beforeEach(() => {
        workflowRuntime.getStepState = jest.fn().mockReturnValue({ attempt: 4 });
        workflowRuntime.failStep = jest.fn();
        workflowRuntime.setWorkflowError = jest.fn();
      });

      it('should fail the step with appropriate error', async () => {
        await underTest.catchError();
        expect(workflowRuntime.failStep).toHaveBeenCalledWith(
          step.id,
          new Error('Retry step "retryStep1" has exceeded the maximum number of attempts.')
        );
      });
    });
  });
});
