/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitRetryNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../../workflow_event_logger';
import { ExitRetryNodeImpl } from '../exit_retry_node_impl';

describe('ExitRetryNodeImpl', () => {
  let underTest: ExitRetryNodeImpl;
  let node: ExitRetryNode;
  let stepExecutionRuntime: StepExecutionRuntime;
  let workflowRuntime: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;

  beforeEach(() => {
    node = {
      id: 'exit-retry-1',
      type: 'exit-retry',
      stepId: 'test-retry-step',
      stepType: 'retry',
      startNodeId: 'enter-retry-1',
    };
    stepExecutionRuntime = {
      finishStep: jest.fn(),
      getCurrentStepState: jest.fn().mockReturnValue({ attempt: 2 }),
      setCurrentStepState: jest.fn(),
    } as unknown as StepExecutionRuntime;
    workflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;
    workflowLogger = {
      logDebug: jest.fn(),
      logError: jest.fn(),
    } as unknown as IWorkflowEventLogger;
    underTest = new ExitRetryNodeImpl(node, stepExecutionRuntime, workflowRuntime, workflowLogger);
  });

  describe('run', () => {
    it('should finish the retry step', async () => {
      await underTest.run();
      expect(stepExecutionRuntime.finishStep).toHaveBeenCalledWith();
    });

    it('should reset the retry step state', async () => {
      await underTest.run();
      expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith(undefined);
    });

    it('should log debug message', async () => {
      await underTest.run();
      expect(workflowLogger.logDebug).toHaveBeenCalledWith(
        `Exiting retry step test-retry-step after 2 attempts.`
      );
    });

    it('should go to next step', async () => {
      await underTest.run();
      expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });
  });
});
