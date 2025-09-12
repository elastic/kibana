/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaitGraphNode } from '@kbn/workflows';
import { WaitStepImpl } from './wait_step';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { WorkflowTaskManager } from '../../workflow_task_manager/workflow_task_manager';

describe('WaitStepImpl', () => {
  let underTest: WaitStepImpl;

  let node: WaitGraphNode;
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
      setWaitStep: jest.fn(),
      getStepState: jest.fn(),
      setStepState: jest.fn(),
      goToNextStep: jest.fn(),
      getWorkflowExecution: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;

    workflowLogger = {
      logInfo: jest.fn(),
      logDebug: jest.fn(),
    } as unknown as IWorkflowEventLogger;

    workflowTaskManager = {
      scheduleResumeTask: jest.fn(),
    } as unknown as WorkflowTaskManager;

    underTest = new WaitStepImpl(node, workflowRuntime, workflowLogger, workflowTaskManager);
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
      expect(workflowRuntime.startStep).toHaveBeenCalledWith(node.id);

      await jest.advanceTimersByTimeAsync(5000);
      await runPromise;

      expect(workflowRuntime.finishStep).toHaveBeenCalledWith(node.id);
    });

    it('should go to the next node', async () => {
      node.configuration.with.duration = '1s';
      const runPromise = underTest.handleShortDuration();

      await jest.advanceTimersByTimeAsync(1000);
      await runPromise;

      expect(workflowRuntime.navigateToNextNode).toHaveBeenCalledWith();
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
        (workflowRuntime.getCurrentStepState as jest.Mock).mockReturnValue(undefined);
        (workflowRuntime.getWorkflowExecution as jest.Mock).mockReturnValue({
          id: 'workflow-1',
        });
        (workflowTaskManager.scheduleResumeTask as jest.Mock).mockResolvedValue({
          taskId: 'resume-task-1',
        });
      });

      it('should call getStepState with node id one time', async () => {
        node.configuration.with.duration = '6s';
        await underTest.handleLongDuration();
        expect(workflowRuntime.getCurrentStepState).toHaveBeenCalledWith(node.id);
        expect(workflowRuntime.getCurrentStepState).toHaveBeenCalledTimes(1);
      });

      it('should start the step', async () => {
        node.configuration.with.duration = '10s';
        await underTest.handleLongDuration();
        expect(workflowRuntime.startStep).toHaveBeenCalledWith(node.id);
        expect(workflowRuntime.finishStep).not.toHaveBeenCalled();
      });

      it('should schedule a resume task for the duration', async () => {
        node.configuration.with.duration = '1w';
        await underTest.handleLongDuration();
        expect(workflowTaskManager.scheduleResumeTask).toHaveBeenCalledWith({
          runAt: new Date(Date.now() + 604800000), // 1 week in ms
          workflowRunId: 'workflow-1',
        });
      });

      it('should set step state with resume task ID', async () => {
        node.configuration.with.duration = '6s';
        await underTest.handleLongDuration();
        expect(workflowRuntime.setCurrentStepState).toHaveBeenCalledWith(node.id, {
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
    });

    describe('exiting long wait', () => {
      beforeEach(() => {
        (workflowRuntime.getCurrentStepState as jest.Mock).mockReturnValue({
          resumeExecutionTaskId: 'resume-task-1',
        });
        (workflowRuntime.getWorkflowExecution as jest.Mock).mockReturnValue({
          id: 'workflow-1',
        });
      });

      it('should reset step state', async () => {
        node.configuration.with.duration = '6s';
        await underTest.handleLongDuration();
        expect(workflowRuntime.setCurrentStepState).toHaveBeenCalledWith('wait-step', undefined);
      });

      it('should finish the step', async () => {
        node.configuration.with.duration = '6s';
        await underTest.handleLongDuration();
        expect(workflowRuntime.finishStep).toHaveBeenCalledWith(node.id);
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
        expect(workflowRuntime.navigateToNextNode).toHaveBeenCalledWith();
      });
    });
  });
});
