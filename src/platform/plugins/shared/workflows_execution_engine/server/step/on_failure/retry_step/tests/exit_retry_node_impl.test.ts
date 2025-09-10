/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitRetryNode } from '@kbn/workflows';
import { ExitRetryNodeImpl } from '../exit_retry_node_impl';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../../workflow_event_logger/workflow_event_logger';

describe('ExitRetryNodeImpl', () => {
  let underTest: ExitRetryNodeImpl;
  let step: ExitRetryNode;
  let workflowRuntime: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;

  beforeEach(() => {
    step = {
      id: 'exit-retry-1',
      type: 'exit-retry',
      startNodeId: 'enter-retry-1',
    };
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logDebug = jest.fn();
    workflowLogger.logError = jest.fn();
    underTest = new ExitRetryNodeImpl(step, workflowRuntime, workflowLogger);
  });

  describe('run', () => {
    beforeEach(() => {
      workflowRuntime.exitScope = jest.fn();
      workflowRuntime.goToNextStep = jest.fn();
      workflowRuntime.getStepState = jest.fn().mockReturnValue({ attempt: 2 });
      workflowRuntime.finishStep = jest.fn();
      workflowRuntime.setStepState = jest.fn();
    });

    it('should exit scope', async () => {
      await underTest.run();
      expect(workflowRuntime.exitScope).toHaveBeenCalled();
    });

    it('should finish the retry step', async () => {
      workflowRuntime.finishStep = jest.fn();
      await underTest.run();
      expect(workflowRuntime.finishStep).toHaveBeenCalledWith(step.startNodeId);
    });

    it('should reset the retry step state', async () => {
      workflowRuntime.setStepState = jest.fn();
      await underTest.run();
      expect(workflowRuntime.setStepState).toHaveBeenCalledWith(step.startNodeId, undefined);
    });

    it('should log debug message', async () => {
      await underTest.run();
      expect(workflowLogger.logDebug).toHaveBeenCalledWith(
        `Exiting retry step enter-retry-1 after 2 attempts.`
      );
    });

    it('should go to next step', async () => {
      await underTest.run();
      expect(workflowRuntime.goToNextStep).toHaveBeenCalled();
    });
  });
});
