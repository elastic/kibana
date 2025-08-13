/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WaitStepImpl } from './wait_step';
import { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import { WorkflowTaskManager } from '../../workflow_task_manager/workflow_task_manager';

describe('WaitStepImpl', () => {
  let underTest: WaitStepImpl;

  let node: any;
  let workflowRuntime: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;
  let workflowTaskManager: WorkflowTaskManager;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    node = {
      id: 'wait-step',
      configuration: {
        with: {
          duration: '1s', // 1 second
        },
      },
    } as any;

    workflowRuntime = {
      startStep: jest.fn(),
      finishStep: jest.fn(),
      getStepState: jest.fn(),
      setStepState: jest.fn(),
      goToNextStep: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;

    workflowLogger = {
      logInfo: jest.fn(),
    } as unknown as IWorkflowEventLogger;

    workflowTaskManager = {
      scheduleResumeTask: jest.fn(),
    } as unknown as WorkflowTaskManager;

    underTest = new WaitStepImpl(node, workflowRuntime, workflowLogger, workflowTaskManager);
  });

  describe('short duration', () => {
    it('should wait for the duration less then 5sec and then resume', async () => {
      node.configuration.with.duration = '4s'; // 4 seconds
      underTest = new WaitStepImpl(node, workflowRuntime, workflowLogger, workflowTaskManager);
      const runPromise = underTest.run();
      await jest.advanceTimersByTimeAsync(0);
      expect(workflowRuntime.startStep).toHaveBeenCalledWith(node.id);

      await jest.advanceTimersByTimeAsync(4000);
      await runPromise;

      expect(workflowRuntime.finishStep).toHaveBeenCalledWith(node.id);
    });
  });
});
