/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ExecutionStatus,
  WORKFLOW_EXECUTE_ASYNC_STEP_TYPE,
  WORKFLOW_EXECUTE_STEP_TYPE,
} from '@kbn/workflows';
import { handleExecutionDelay } from './handle_execution_delay';
import type { WorkflowExecutionLoopParams } from './types';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
const makeParams = (): jest.Mocked<WorkflowExecutionLoopParams> =>
  ({
    workflowRuntime: {
      getWorkflowExecution: jest.fn().mockReturnValue({ id: 'exec-parent' }),
    },
    workflowExecutionState: {
      updateWorkflowExecution: jest.fn(),
    },
    workflowTaskManager: {
      scheduleResumeTask: jest.fn().mockResolvedValue({ taskId: 'resume-task-1' }),
    },
    fakeRequest: {},
  } as unknown as jest.Mocked<WorkflowExecutionLoopParams>);

const makeStepRuntime = (
  overrides: Partial<StepExecutionRuntime> = {}
): jest.Mocked<StepExecutionRuntime> =>
  ({
    stepExecution: undefined,
    abortController: new AbortController(),
    node: { stepType: 'wait' },
    ...overrides,
  } as unknown as jest.Mocked<StepExecutionRuntime>);

describe('handleExecutionDelay', () => {
  describe('WAITING_FOR_INPUT step', () => {
    it('should set workflow status to WAITING_FOR_INPUT', async () => {
      const params = makeParams();
      const stepRuntime = makeStepRuntime({
        stepExecution: { status: ExecutionStatus.WAITING_FOR_INPUT } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.WAITING_FOR_INPUT,
      });
    });

    it('should not schedule any resume task', async () => {
      const params = makeParams();
      const stepRuntime = makeStepRuntime({
        stepExecution: { status: ExecutionStatus.WAITING_FOR_INPUT } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.scheduleResumeTask).not.toHaveBeenCalled();
    });
  });

  describe('non-waiting step (no-op)', () => {
    it('should not update workflow status when step has no execution', async () => {
      const params = makeParams();
      const stepRuntime = makeStepRuntime({ stepExecution: undefined });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should not update workflow status when step is RUNNING', async () => {
      const params = makeParams();
      const stepRuntime = makeStepRuntime({
        stepExecution: { status: ExecutionStatus.RUNNING } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
    });
  });

  describe('missing resumeAt', () => {
    it('returns early without scheduling when resumeAt is not a string', async () => {
      const params = makeParams();
      const stepRuntime = makeStepRuntime({
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: {},
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.scheduleResumeTask).not.toHaveBeenCalled();
      expect(params.workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
    });
  });

  describe('non-sync step: short wait (< 5s) in-process', () => {
    it('sleeps in-process and sets RUNNING without TM task', async () => {
      const params = makeParams();
      const resumeAt = new Date(Date.now() + 100).toISOString();
      const stepRuntime = makeStepRuntime({
        node: { stepType: 'wait' } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.scheduleResumeTask).not.toHaveBeenCalled();
      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.RUNNING,
      });
    });

    it('on step abort during sleep sets RUNNING and returns (cancel / interrupt path)', async () => {
      const params = makeParams();
      const resumeAt = new Date(Date.now() + 3000).toISOString();
      const ac = new AbortController();
      const stepRuntime = makeStepRuntime({
        node: { stepType: 'wait' } as any,
        abortController: ac,
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt },
        } as any,
      });

      queueMicrotask(() => ac.abort());

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.scheduleResumeTask).not.toHaveBeenCalled();
      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.RUNNING,
      });
    });
  });

  describe('non-sync step: long wait (>= 5s) schedules TM + pendingResumeTaskId', () => {
    it('schedules resume task and stores pendingResumeTaskId', async () => {
      const params = makeParams();
      const resumeAtDate = new Date(Date.now() + 8000);
      const resumeAt = resumeAtDate.toISOString();
      const stepRuntime = makeStepRuntime({
        node: { stepType: 'wait' } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.scheduleResumeTask).toHaveBeenCalledTimes(1);
      const call = (params.workflowTaskManager.scheduleResumeTask as jest.Mock).mock.calls[0][0];
      expect(call.workflowExecution).toEqual({ id: 'exec-parent' });
      expect(call.resumeAt.getTime()).toBe(resumeAtDate.getTime());
      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        pendingResumeTaskId: 'resume-task-1',
      });
    });
  });

  describe('sync workflow.execute: always TM path (child can runSoon pendingResumeTaskId)', () => {
    it('schedules TM even when resumeAt is within 5s (no in-process sleep)', async () => {
      const params = makeParams();
      (params.workflowTaskManager.scheduleResumeTask as jest.Mock).mockResolvedValue({
        taskId: 'sync-resume-99',
      });
      const resumeAtDate = new Date(Date.now() + 2000);
      const stepRuntime = makeStepRuntime({
        node: { stepType: WORKFLOW_EXECUTE_STEP_TYPE } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt: resumeAtDate.toISOString() },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.scheduleResumeTask).toHaveBeenCalledTimes(1);
      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        pendingResumeTaskId: 'sync-resume-99',
      });
      expect(params.workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalledWith({
        status: ExecutionStatus.RUNNING,
      });
    });

    it('workflow.executeAsync uses short in-process path like other steps', async () => {
      const params = makeParams();
      const resumeAt = new Date(Date.now() + 100).toISOString();
      const stepRuntime = makeStepRuntime({
        node: { stepType: WORKFLOW_EXECUTE_ASYNC_STEP_TYPE } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.scheduleResumeTask).not.toHaveBeenCalled();
      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.RUNNING,
      });
    });
  });

  describe('resumeAt in the past', () => {
    it('non-sync step: resumeAt in the past uses 0ms in-process sleep (no negative timeout)', async () => {
      const params = makeParams();
      const resumeAt = new Date(Date.now() - 5000).toISOString();
      const stepRuntime = makeStepRuntime({
        node: { stepType: 'wait' } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.scheduleResumeTask).not.toHaveBeenCalled();
      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.RUNNING,
      });
    });

    it('sync execute step: resumeAt in the past still schedules TM (child needs task to runSoon)', async () => {
      const params = makeParams();
      const resumeAt = new Date(Date.now() - 2000).toISOString();
      const stepRuntime = makeStepRuntime({
        node: { stepType: WORKFLOW_EXECUTE_STEP_TYPE } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.scheduleResumeTask).toHaveBeenCalledTimes(1);
      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        pendingResumeTaskId: 'resume-task-1',
      });
    });
  });

  describe('exact 5s boundary', () => {
    it('diff exactly at SHORT_DURATION_THRESHOLD goes to TM path', async () => {
      const params = makeParams();
      const resumeAt = new Date(Date.now() + 5000).toISOString();
      const stepRuntime = makeStepRuntime({
        node: { stepType: 'wait' } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.scheduleResumeTask).toHaveBeenCalledTimes(1);
      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        pendingResumeTaskId: 'resume-task-1',
      });
    });
  });

  describe('TM scheduling errors', () => {
    it('propagates scheduleResumeTask failure (sync execute path)', async () => {
      const params = makeParams();
      (params.workflowTaskManager.scheduleResumeTask as jest.Mock).mockRejectedValue(
        new Error('task manager unavailable')
      );
      const resumeAt = new Date(Date.now() + 2000).toISOString();
      const stepRuntime = makeStepRuntime({
        node: { stepType: WORKFLOW_EXECUTE_STEP_TYPE } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt },
        } as any,
      });

      await expect(handleExecutionDelay(params, stepRuntime)).rejects.toThrow(
        'task manager unavailable'
      );
    });
  });
});
