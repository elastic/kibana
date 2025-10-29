/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaitStep } from '@kbn/workflows';
import type { WaitGraphNode } from '@kbn/workflows/graph';
import { WaitStepImpl } from './wait_step';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { WorkflowTaskManager } from '../../workflow_task_manager/workflow_task_manager';

describe('WaitStepImpl', () => {
  let underTest: WaitStepImpl;

  let node: WaitGraphNode;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let workflowLogger: IWorkflowEventLogger;
  let workflowTaskManager: WorkflowTaskManager;

  let stepContextAbortController: AbortController;
  let mockContextManager: jest.Mocked<Pick<WorkflowContextManager, 'getContext'>> & {
    abortController: AbortController;
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    stepContextAbortController = new AbortController();
    mockContextManager = {
      getContext: jest.fn(),
      abortController: stepContextAbortController,
    };

    node = {
      id: 'wait-step',
      type: 'wait',
      stepId: 'wait-step',
      stepType: 'wait',
      configuration: {
        with: {
          duration: '1s', // 1 second
        },
      } as WaitStep,
    };

    mockStepExecutionRuntime = {
      contextManager: mockContextManager,
      startStep: jest.fn().mockResolvedValue(undefined),
      finishStep: jest.fn().mockResolvedValue(undefined),
      failStep: jest.fn().mockResolvedValue(undefined),
      getCurrentStepState: jest.fn(),
      setCurrentStepState: jest.fn().mockResolvedValue(undefined),
      setWaitStep: jest.fn().mockResolvedValue(undefined),
      stepExecutionId: 'test-step-exec-id',
      abortController: stepContextAbortController,
    } as any;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
      getWorkflowExecution: jest.fn(),
    } as any;

    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logInfo = jest.fn();
    workflowLogger.logDebug = jest.fn();

    workflowTaskManager = {} as unknown as WorkflowTaskManager;
    workflowTaskManager.scheduleResumeTask = jest.fn();

    underTest = new WaitStepImpl(
      node,
      mockStepExecutionRuntime,
      mockWorkflowRuntime,
      workflowLogger,
      workflowTaskManager
    );
  });

  describe('invalid durations', () => {
    test.each([
      'invalid-duration',
      '5ss',
      '10m5ss',
      '1s1w',
      '3d4w',
      '2h1d',
      '5m10h',
      '-1s',
      '0',
      '',
      '  ',
      '1.5s',
      '1,000s',
      's5',
      'ms500',
    ])(`should throw invalid format error for %s`, async (invalidDuration) => {
      node.configuration.with.duration = invalidDuration;
      await expect(underTest.run()).rejects.toThrow(
        new Error(
          `Invalid duration format: ${invalidDuration}. Use format like "1w2d3h4m5s6ms" with units in descending order.`
        )
      );
    });
  });

  describe('short duration', () => {
    it('should handle short duration for up to 5 seconds', async () => {
      node.configuration.with.duration = '5s';
      underTest.handleShortDuration = jest.fn();
      underTest.handleLongDuration = jest.fn();
      await underTest.run();
      expect(underTest.handleShortDuration).toHaveBeenCalled();
      expect(underTest.handleLongDuration).not.toHaveBeenCalled();
    });

    it('should wait for the duration less then 5sec and then resume', async () => {
      node.configuration.with.duration = '5s';
      const runPromise = underTest.handleShortDuration();
      await jest.advanceTimersByTimeAsync(0);
      expect(mockStepExecutionRuntime.startStep).toHaveBeenCalledWith();

      await jest.advanceTimersByTimeAsync(5000);
      await runPromise;

      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith();
    });

    it('should go to the next node', async () => {
      node.configuration.with.duration = '1s';
      const runPromise = underTest.handleShortDuration();

      await jest.advanceTimersByTimeAsync(1000);
      await runPromise;

      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalledWith();
    });

    it('should log start and finish wait', async () => {
      node.configuration.with.duration = '3s';

      const runPromise = underTest.handleShortDuration();
      await jest.advanceTimersByTimeAsync(0);
      expect(workflowLogger.logInfo).toBeCalledWith(`Waiting for 3s in step wait-step`);

      await jest.advanceTimersByTimeAsync(3000);
      await runPromise;

      expect(workflowLogger.logInfo).toHaveBeenCalledWith(
        `Finished waiting for 3s in step wait-step`
      );
    });

    it('should abort wait when abort signal is triggered', async () => {
      node.configuration.with.duration = '5s';
      const runPromise = underTest.handleShortDuration();

      await jest.advanceTimersByTimeAsync(2000);
      stepContextAbortController.abort();

      await expect(runPromise).rejects.toThrow(new Error('Wait step was aborted'));

      expect(mockStepExecutionRuntime.startStep).toHaveBeenCalledWith();
      expect(mockStepExecutionRuntime.finishStep).not.toHaveBeenCalled();
      expect(mockWorkflowRuntime.navigateToNextNode).not.toHaveBeenCalled();
    });
  });

  describe('long duration', () => {
    test.each(['5s1ms', '6s', '10s', '1m', '1w30s', '2h15m', '3d', '4w', '1h39s'])(
      'should handle long duration for more than 5 seconds (%s)',
      async (duration) => {
        node.configuration.with.duration = duration;
        underTest.handleShortDuration = jest.fn();
        underTest.handleLongDuration = jest.fn();
        await underTest.run();
        expect(underTest.handleShortDuration).not.toHaveBeenCalled();
        expect(underTest.handleLongDuration).toHaveBeenCalled();
      }
    );

    describe('entering long wait', () => {
      beforeEach(() => {
        (mockStepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue(undefined);
        (mockWorkflowRuntime.getWorkflowExecution as jest.Mock).mockReturnValue({
          id: 'workflow-1',
          spaceId: 'default',
        });
        (workflowTaskManager.scheduleResumeTask as jest.Mock).mockResolvedValue({
          taskId: 'resume-task-1',
        });
      });

      it('should call getCurrentStepState one time', async () => {
        node.configuration.with.duration = '6s';
        await underTest.handleLongDuration();
        expect(mockStepExecutionRuntime.getCurrentStepState).toHaveBeenCalledWith();
        expect(mockStepExecutionRuntime.getCurrentStepState).toHaveBeenCalledTimes(1);
      });

      it('should start the step', async () => {
        node.configuration.with.duration = '10s';
        await underTest.handleLongDuration();
        expect(mockStepExecutionRuntime.startStep).toHaveBeenCalledWith();
        expect(mockStepExecutionRuntime.finishStep).not.toHaveBeenCalled();
      });

      it('should schedule a resume task for the duration', async () => {
        node.configuration.with.duration = '1w';
        await underTest.handleLongDuration();
        expect(workflowTaskManager.scheduleResumeTask).toHaveBeenCalledWith({
          runAt: new Date(Date.now() + 604800000), // 1 week in ms
          workflowRunId: 'workflow-1',
          spaceId: 'default',
        });
      });

      it('should set step state with resume task ID', async () => {
        node.configuration.with.duration = '6s';
        await underTest.handleLongDuration();
        expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
          resumeExecutionTaskId: 'resume-task-1',
        });
      });

      it('should log start wait', async () => {
        node.configuration.with.duration = '1d';
        await underTest.handleLongDuration();
        expect(workflowLogger.logInfo).toHaveBeenCalledWith(`Waiting for 1d in step ${node.id}`);
      });

      it('should log debug message about scheduled resume task', async () => {
        node.configuration.with.duration = '6s';
        await underTest.handleLongDuration();
        expect(workflowLogger.logDebug).toHaveBeenCalledWith(
          expect.stringContaining(
            `Scheduled resume execution task for wait step "${node.id}" with ID resume-task-1`
          )
        );
        expect(workflowLogger.logDebug).toHaveBeenCalledWith(
          expect.stringContaining(
            `Execution will resume at ${new Date(Date.now() + 6000).toISOString()}`
          )
        );
      });

      it('should set wait step status', async () => {
        node.configuration.with.duration = '6s';
        await underTest.handleLongDuration();
        expect(mockStepExecutionRuntime.setWaitStep).toHaveBeenCalledWith();
      });
    });

    describe('exiting long wait', () => {
      beforeEach(() => {
        (mockStepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({
          resumeExecutionTaskId: 'resume-task-1',
        });
        (mockWorkflowRuntime.getWorkflowExecution as jest.Mock).mockReturnValue({
          id: 'workflow-1',
        });
      });

      it('should reset step state', async () => {
        node.configuration.with.duration = '6s';
        await underTest.handleLongDuration();
        expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith(undefined);
      });

      it('should finish the step', async () => {
        node.configuration.with.duration = '6s';
        await underTest.handleLongDuration();
        expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith();
      });

      it('should log finish wait', async () => {
        node.configuration.with.duration = '30m';
        await underTest.handleLongDuration();
        expect(workflowLogger.logInfo).toHaveBeenCalledWith(
          `Finished waiting for 30m in step wait-step`
        );
      });

      it('should log debug message about scheduled resume task', async () => {
        node.configuration.with.duration = '6s';
        await underTest.handleLongDuration();
        expect(workflowLogger.logDebug).toHaveBeenCalledWith(
          expect.stringContaining(`Resuming execution of wait step "wait-step" after long wait.`)
        );
      });

      it('should go to the next step', async () => {
        node.configuration.with.duration = '200s';
        await underTest.handleLongDuration();
        expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalledWith();
      });
    });
  });
});
