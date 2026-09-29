/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import {
  ExecutionStatus,
  WORKFLOW_EXECUTE_ASYNC_STEP_TYPE,
  WORKFLOW_EXECUTE_STEP_TYPE,
} from '@kbn/workflows';
import {
  ensureWorkflowIdleTimeoutResumeAfterLoop,
  getWorkflowIdleTimeoutResumeAtAfterLoop,
  handleExecutionDelay,
} from './handle_execution_delay';
import { ResumeTaskSchedulingError } from './resume_task_scheduling_error';
import type { WorkflowExecutionLoopParams } from './types';
import { DEFAULT_WORKFLOW_TIMEOUT } from '../default_workflow_settings';
import {
  createMockWorkflowExecutionCursor,
  type MockWorkflowExecutionCursorOptions,
} from '../workflow_context_manager/mocks/workflow_execution_cursor.mock';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
const makeParams = (
  cursorOptions: MockWorkflowExecutionCursorOptions = {}
): Mocked<WorkflowExecutionLoopParams> =>
  ({
    workflowRuntime: {
      getWorkflowExecution: vi.fn().mockReturnValue({
        id: 'exec-parent',
        spaceId: 'default',
        startedAt: '2025-06-01T12:00:00.000Z',
        scopeStack: [],
      }),
      getCurrentNode: vi.fn().mockReturnValue(undefined),
    },
    workflowExecutionCursor: createMockWorkflowExecutionCursor(cursorOptions),
    workflowExecutionState: {
      updateWorkflowExecution: vi.fn(),
      getLatestStepExecution: vi.fn().mockReturnValue(undefined),
      getStepExecutionsByStepId: vi.fn().mockReturnValue([]),
    },
    workflowExecutionRepository: {
      getWorkflowExecutionById: vi.fn().mockResolvedValue(undefined),
    },
    workflowTaskManager: {
      scheduleResumeTask: vi.fn().mockResolvedValue({ taskId: 'resume-task-1' }),
      scheduleWorkflowGlobalTimeoutResumeTask: vi
        .fn()
        .mockResolvedValue({ taskId: 'wf-global-timeout-1' }),
      runExistingResumeTask: vi.fn().mockResolvedValue(undefined),
    },
    fakeRequest: {},
    workflowExecutionGraph: {
      getWorkflowLevelTimeout: vi.fn().mockReturnValue(undefined),
      getNode: vi.fn().mockReturnValue(undefined),
    },
    workflowLogger: {
      logWarn: vi.fn(),
      flushEvents: vi.fn().mockResolvedValue(undefined),
    },
    stepIoService: {
      flush: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as Mocked<WorkflowExecutionLoopParams>);

const makeStepRuntime = (
  overrides: Partial<StepExecutionRuntime> = {}
): Mocked<StepExecutionRuntime> =>
  ({
    stepExecution: undefined,
    abortController: new AbortController(),
    node: { stepType: 'wait' },
    ...overrides,
  } as unknown as Mocked<StepExecutionRuntime>);

describe('handleExecutionDelay', () => {
  describe('WAITING_FOR_INPUT step (HITL)', () => {
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

    it('should not schedule workflow timeout resume when the graph has no workflow-level timeout', async () => {
      const params = makeParams();
      const stepRuntime = makeStepRuntime({
        stepExecution: { status: ExecutionStatus.WAITING_FOR_INPUT } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(
        params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask
      ).not.toHaveBeenCalled();
    });

    it('should schedule approval deadline for waitForApproval without workflow-level timeout', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2025-06-01T12:00:15.000Z'));
        const params = makeParams();
        const stepRuntime = makeStepRuntime({
          node: {
            type: 'waitForApproval',
            stepType: 'waitForApproval',
            configuration: { timeout: '30s' },
          } as any,
          stepExecution: {
            status: ExecutionStatus.WAITING_FOR_INPUT,
            startedAt: '2025-06-01T12:00:00.000Z',
          } as any,
        });

        await handleExecutionDelay(params, stepRuntime);

        expect(
          params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask
        ).toHaveBeenCalledTimes(1);
        const call = (
          params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask as Mock
        ).mock.calls[0][0];
        expect(call.resumeAt.toISOString()).toBe('2025-06-01T12:00:30.000Z');
      } finally {
        vi.useRealTimers();
      }
    });

    it('should schedule input deadline for waitForInput without workflow-level timeout', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2025-06-01T12:00:15.000Z'));
        const params = makeParams();
        const stepRuntime = makeStepRuntime({
          node: {
            type: 'waitForInput',
            stepType: 'waitForInput',
            configuration: { timeout: '30s' },
          } as any,
          stepExecution: {
            status: ExecutionStatus.WAITING_FOR_INPUT,
            startedAt: '2025-06-01T12:00:00.000Z',
          } as any,
        });

        await handleExecutionDelay(params, stepRuntime);

        expect(
          params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask
        ).toHaveBeenCalledTimes(1);
        const call = (
          params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask as Mock
        ).mock.calls[0][0];
        expect(call.resumeAt.toISOString()).toBe('2025-06-01T12:00:30.000Z');
      } finally {
        vi.useRealTimers();
      }
    });

    it('should schedule workflow timeout resume at startedAt + timeout when workflow-level timeout exists', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2025-06-01T13:00:00.000Z'));
        const params = makeParams();
        (params.workflowExecutionGraph.getWorkflowLevelTimeout as Mock).mockReturnValue('2h');

        const stepRuntime = makeStepRuntime({
          stepExecution: { status: ExecutionStatus.WAITING_FOR_INPUT } as any,
        });

        await handleExecutionDelay(params, stepRuntime);

        expect(
          params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask
        ).toHaveBeenCalledTimes(1);
        const call = (
          params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask as Mock
        ).mock.calls[0][0];
        expect(call.workflowExecution).toEqual(
          expect.objectContaining({
            id: 'exec-parent',
            startedAt: '2025-06-01T12:00:00.000Z',
          })
        );
        expect(call.resumeAt.toISOString()).toBe('2025-06-01T14:00:00.000Z');
      } finally {
        vi.useRealTimers();
      }
    });

    it.each([
      {
        label: 'step deadline before workflow global',
        nowIso: '2025-06-01T12:00:15.000Z',
        workflowLevelTimeout: '10m',
      },
      {
        label: 'step deadline with no workflow-level timeout',
        nowIso: '2025-06-01T12:00:10.000Z',
        workflowLevelTimeout: undefined as string | undefined,
      },
    ])(
      'should schedule idle resume from enclosing step timeout ($label)',
      async ({ nowIso, workflowLevelTimeout }) => {
        vi.useFakeTimers();
        try {
          vi.setSystemTime(new Date(nowIso));
          const params = makeParams({
            currentStackFrames: [
              {
                stepId: 'timedParent',
                nestedScopes: [
                  {
                    nodeId: 'enterTimeoutZone_timedParent',
                    nodeType: 'enter-timeout-zone',
                  },
                ],
              },
            ],
          });
          (params.workflowExecutionGraph.getWorkflowLevelTimeout as Mock).mockReturnValue(
            workflowLevelTimeout
          );
          (params.workflowExecutionGraph.getNode as Mock).mockImplementation(
            (nodeId: string) => {
              if (nodeId === 'enterTimeoutZone_timedParent') {
                return {
                  id: 'enterTimeoutZone_timedParent',
                  type: 'enter-timeout-zone',
                  stepId: 'timedParent',
                  stepType: 'step_level_timeout',
                  timeout: '30s',
                };
              }
              return undefined;
            }
          );
          (params.workflowExecutionState.getStepExecutionsByStepId as Mock).mockImplementation(
            (stepId: string) =>
              stepId === 'timedParent'
                ? [
                    { stepType: 'step_level_timeout', startedAt: '2025-06-01T12:00:00.000Z' },
                    { stepType: 'foreach', startedAt: '2025-06-01T12:00:05.000Z' },
                  ]
                : []
          );

          const stepRuntime = makeStepRuntime({
            stepExecution: { status: ExecutionStatus.WAITING_FOR_INPUT } as any,
          });

          await handleExecutionDelay(params, stepRuntime);

          expect(
            params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask
          ).toHaveBeenCalledTimes(1);
          const call = (
            params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask as Mock
          ).mock.calls[0][0];
          expect(call.resumeAt.toISOString()).toBe('2025-06-01T12:00:30.000Z');
        } finally {
          vi.useRealTimers();
        }
      }
    );
    it('should schedule idle resume from the rendered step timeout frozen on zone state', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2025-06-01T12:00:10.000Z'));
        const params = makeParams({
          currentStackFrames: [
            {
              stepId: 'timedParent',
              nestedScopes: [
                { nodeId: 'enterTimeoutZone_timedParent', nodeType: 'enter-timeout-zone' },
              ],
            },
          ],
        });
        (params.workflowExecutionGraph.getNode as Mock).mockImplementation((nodeId: string) =>
          nodeId === 'enterTimeoutZone_timedParent'
            ? {
                id: 'enterTimeoutZone_timedParent',
                type: 'enter-timeout-zone',
                stepId: 'timedParent',
                stepType: 'step_level_timeout',
                timeout: '{{ inputs.stepTimeout }}',
              }
            : undefined
        );
        (params.workflowExecutionState.getStepExecutionsByStepId as Mock).mockImplementation(
          (stepId: string) =>
            stepId === 'timedParent'
              ? [
                  {
                    stepType: 'step_level_timeout',
                    startedAt: '2025-06-01T12:00:00.000Z',
                    state: { resolvedTimeout: '45s' },
                  },
                  { stepType: 'foreach', startedAt: '2025-06-01T12:00:05.000Z', state: {} },
                ]
              : []
        );

        const stepRuntime = makeStepRuntime({
          stepExecution: { status: ExecutionStatus.WAITING_FOR_INPUT } as any,
        });

        await handleExecutionDelay(params, stepRuntime);

        const call = (
          params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask as Mock
        ).mock.calls[0][0];
        expect(call.resumeAt.toISOString()).toBe('2025-06-01T12:00:45.000Z');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('WAITING_FOR_CHILD step (sync child workflow)', () => {
    it('should set workflow status to WAITING_FOR_CHILD', async () => {
      const params = makeParams();
      const stepRuntime = makeStepRuntime({
        node: { stepType: WORKFLOW_EXECUTE_STEP_TYPE } as any,
        stepExecution: { status: ExecutionStatus.WAITING_FOR_CHILD } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.WAITING_FOR_CHILD,
      });
      expect(
        params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask
      ).not.toHaveBeenCalled();
    });

    it('should schedule workflow timeout resume when WAITING_FOR_CHILD and workflow-level timeout exists', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2025-06-01T13:00:00.000Z'));
        const params = makeParams();
        (params.workflowExecutionGraph.getWorkflowLevelTimeout as Mock).mockReturnValue('2h');

        const stepRuntime = makeStepRuntime({
          node: { stepType: WORKFLOW_EXECUTE_STEP_TYPE } as any,
          stepExecution: { status: ExecutionStatus.WAITING_FOR_CHILD } as any,
        });

        await handleExecutionDelay(params, stepRuntime);

        expect(
          params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask
        ).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    // Requestless parent wake-up can only ever reach a task that this branch armed. Every
    // execution compiles with defaultWorkflowSettings, so the default workflow timeout alone must
    // keep arming it even when the waiting step declares no deadline of its own; otherwise a plain
    // sync parent would have no task to wake and would be fail-closed instead of resumed.
    it('should arm the parent wake task from the default workflow timeout alone', async () => {
      const params = makeParams();
      (params.workflowExecutionGraph.getWorkflowLevelTimeout as Mock).mockReturnValue(
        DEFAULT_WORKFLOW_TIMEOUT
      );
      (params.workflowExecutionRepository.getWorkflowExecutionById as Mock).mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.RUNNING,
      });

      const stepRuntime = makeStepRuntime({
        node: { stepType: WORKFLOW_EXECUTE_STEP_TYPE } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING_FOR_CHILD,
          state: { executionId: 'child-exec-1' },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(
        params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask
      ).toHaveBeenCalledTimes(1);
      expect(params.workflowExecutionRepository.getWorkflowExecutionById).toHaveBeenCalledWith(
        'child-exec-1',
        'default'
      );
    });

    it('should immediately wake the parent when the sync child is already terminal', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2025-06-01T13:00:00.000Z'));
        const params = makeParams();
        (params.workflowExecutionGraph.getWorkflowLevelTimeout as Mock).mockReturnValue('2h');
        (
          params.workflowExecutionRepository.getWorkflowExecutionById as Mock
        ).mockResolvedValue({
          id: 'child-exec-1',
          status: ExecutionStatus.COMPLETED,
        });

        const stepRuntime = makeStepRuntime({
          node: { stepType: WORKFLOW_EXECUTE_STEP_TYPE } as any,
          stepExecution: {
            status: ExecutionStatus.WAITING_FOR_CHILD,
            state: { executionId: 'child-exec-1' },
          } as any,
        });

        await handleExecutionDelay(params, stepRuntime);

        expect(params.workflowExecutionRepository.getWorkflowExecutionById).toHaveBeenCalledWith(
          'child-exec-1',
          'default'
        );
        expect(params.workflowTaskManager.runExistingResumeTask).toHaveBeenCalledWith(
          'exec-parent'
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('should wake the parent in the default space when the execution has no spaceId', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2025-06-01T13:00:00.000Z'));
        const params = makeParams();
        (params.workflowRuntime.getWorkflowExecution as Mock).mockReturnValue({
          id: 'exec-parent',
          spaceId: undefined,
          startedAt: '2025-06-01T12:00:00.000Z',
          scopeStack: [],
        });
        (params.workflowExecutionGraph.getWorkflowLevelTimeout as Mock).mockReturnValue('2h');
        (
          params.workflowExecutionRepository.getWorkflowExecutionById as Mock
        ).mockResolvedValue({
          id: 'child-exec-1',
          status: ExecutionStatus.COMPLETED,
        });

        const stepRuntime = makeStepRuntime({
          node: { stepType: WORKFLOW_EXECUTE_STEP_TYPE } as any,
          stepExecution: {
            status: ExecutionStatus.WAITING_FOR_CHILD,
            state: { executionId: 'child-exec-1' },
          } as any,
        });

        await handleExecutionDelay(params, stepRuntime);

        expect(params.workflowExecutionRepository.getWorkflowExecutionById).toHaveBeenCalledWith(
          'child-exec-1',
          'default'
        );
        expect(params.workflowTaskManager.runExistingResumeTask).toHaveBeenCalledWith(
          'exec-parent'
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not wake the parent when the sync child is still running', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2025-06-01T13:00:00.000Z'));
        const params = makeParams();
        (params.workflowExecutionGraph.getWorkflowLevelTimeout as Mock).mockReturnValue('2h');
        (
          params.workflowExecutionRepository.getWorkflowExecutionById as Mock
        ).mockResolvedValue({
          id: 'child-exec-1',
          status: ExecutionStatus.RUNNING,
        });

        const stepRuntime = makeStepRuntime({
          node: { stepType: WORKFLOW_EXECUTE_STEP_TYPE } as any,
          stepExecution: {
            status: ExecutionStatus.WAITING_FOR_CHILD,
            state: { executionId: 'child-exec-1' },
          } as any,
        });

        await handleExecutionDelay(params, stepRuntime);

        expect(params.workflowTaskManager.runExistingResumeTask).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not fail the wait when the handshake cannot wake the parent', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2025-06-01T13:00:00.000Z'));
        const params = makeParams();
        (params.workflowExecutionGraph.getWorkflowLevelTimeout as Mock).mockReturnValue('2h');
        (
          params.workflowExecutionRepository.getWorkflowExecutionById as Mock
        ).mockResolvedValue({
          id: 'child-exec-1',
          status: ExecutionStatus.COMPLETED,
        });
        (params.workflowTaskManager.runExistingResumeTask as Mock).mockRejectedValue(
          new Error('not found')
        );

        const stepRuntime = makeStepRuntime({
          node: { stepType: WORKFLOW_EXECUTE_STEP_TYPE } as any,
          stepExecution: {
            status: ExecutionStatus.WAITING_FOR_CHILD,
            state: { executionId: 'child-exec-1' },
          } as any,
        });

        await expect(handleExecutionDelay(params, stepRuntime)).resolves.toBeUndefined();
        expect(params.workflowLogger.logWarn).toHaveBeenCalledWith(
          expect.stringContaining('Failed to wake parent after detecting terminal sync child')
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('should still handshake when timeout scheduling fails', async () => {
      const params = makeParams();
      (params.workflowExecutionGraph.getWorkflowLevelTimeout as Mock).mockReturnValue('2h');
      (
        params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask as Mock
      ).mockRejectedValue(new Error('timer schedule failed'));
      (params.workflowExecutionRepository.getWorkflowExecutionById as Mock).mockResolvedValue({
        id: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
      });

      const stepRuntime = makeStepRuntime({
        node: { stepType: WORKFLOW_EXECUTE_STEP_TYPE } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING_FOR_CHILD,
          state: { executionId: 'child-exec-1' },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.runExistingResumeTask).toHaveBeenCalledWith('exec-parent');
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

  describe('short wait (< 5s) in-process', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('sleeps in-process without changing workflow status, flushing, or parking on TM', async () => {
      const params = makeParams();
      const resumeAt = new Date(Date.now() + 100).toISOString();
      const stepRuntime = makeStepRuntime({
        node: { stepType: 'wait' } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt },
        } as any,
      });

      const delayPromise = handleExecutionDelay(params, stepRuntime);
      await vi.advanceTimersByTimeAsync(100);
      await delayPromise;

      expect(params.workflowTaskManager.scheduleResumeTask).not.toHaveBeenCalled();
      expect(params.stepIoService.flush).not.toHaveBeenCalled();
      expect(params.workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
      expect(params.workflowExecutionCursor.stop).not.toHaveBeenCalled();
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

      const delayPromise = handleExecutionDelay(params, stepRuntime);
      await vi.advanceTimersByTimeAsync(100);
      await delayPromise;

      expect(params.workflowTaskManager.scheduleResumeTask).not.toHaveBeenCalled();
      expect(params.workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
      expect(params.workflowExecutionCursor.stop).not.toHaveBeenCalled();
    });
  });

  describe('short wait — abort during in-process sleep (real timers)', () => {
    it('on step abort during sleep does not change workflow status (cancel / interrupt path)', async () => {
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
      expect(params.workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
      expect(params.workflowExecutionCursor.stop).not.toHaveBeenCalled();
    });
  });

  describe('long wait (>= 5s) schedules TM resume task', () => {
    it('schedules resume task and sets workflow status to WAITING', async () => {
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

      expect(params.stepIoService.flush).not.toHaveBeenCalled();
      expect(params.workflowTaskManager.scheduleResumeTask).toHaveBeenCalledTimes(1);
      const call = (params.workflowTaskManager.scheduleResumeTask as Mock).mock.calls[0][0];
      expect(call.workflowExecution).toEqual(expect.objectContaining({ id: 'exec-parent' }));
      expect(call.resumeAt.getTime()).toBe(resumeAtDate.getTime());
      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.WAITING,
      });
      expect(params.workflowExecutionCursor.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('resumeAt in the past', () => {
    it('uses 0ms in-process sleep (no negative timeout)', async () => {
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
      expect(params.workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
    });
  });

  describe('exact 5s boundary', () => {
    it('diff exactly at SHORT_DURATION_THRESHOLD goes to TM path', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2025-06-01T12:00:00.000Z'));
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
        expect(params.stepIoService.flush).not.toHaveBeenCalled();
        expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
          status: ExecutionStatus.WAITING,
        });
        expect(params.workflowExecutionCursor.stop).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('forceTaskSchedule parks on TM even for short remaining delay', () => {
    it('schedules resume and sets WAITING when forceTaskSchedule is set', async () => {
      const params = makeParams();
      const resumeAtDate = new Date(Date.now() + 500);
      const stepRuntime = makeStepRuntime({
        node: { stepType: 'wait' } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt: resumeAtDate.toISOString(), forceTaskSchedule: true },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.scheduleResumeTask).toHaveBeenCalledTimes(1);
      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.WAITING,
      });
      expect(params.workflowExecutionCursor.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('TM scheduling errors', () => {
    it('propagates scheduleResumeTask failure as a ResumeTaskSchedulingError', async () => {
      const params = makeParams();
      const schedulingError = new Error('task manager unavailable');
      (params.workflowTaskManager.scheduleResumeTask as Mock).mockRejectedValue(
        schedulingError
      );
      const resumeAt = new Date(Date.now() + 8000).toISOString();
      const stepRuntime = makeStepRuntime({
        node: { stepType: 'wait' } as any,
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt },
        } as any,
      });

      const error = await handleExecutionDelay(params, stepRuntime).catch((e) => e);

      expect(error).toBeInstanceOf(ResumeTaskSchedulingError);
      expect(error.message).toBe(
        'Failed to schedule workflow resume task: task manager unavailable'
      );
      expect(error.cause).toBe(schedulingError);
    });
  });
});

describe('getWorkflowIdleTimeoutResumeAtAfterLoop', () => {
  it('returns a future runAt when execution is still waiting for input', () => {
    const params = makeParams();
    (params.workflowRuntime.getWorkflowExecution as Mock).mockReturnValue({
      id: 'exec-parent',
      status: ExecutionStatus.WAITING_FOR_INPUT,
      startedAt: '2025-06-01T12:00:00.000Z',
      scopeStack: [],
    });
    (params.workflowRuntime.getCurrentNode as Mock).mockReturnValue({
      stepId: 'app',
      type: 'waitForApproval',
      configuration: { timeout: '24h' },
    });
    (params.workflowExecutionState.getLatestStepExecution as Mock).mockReturnValue({
      startedAt: '2025-06-01T12:00:00.000Z',
    });

    const resumeAt = getWorkflowIdleTimeoutResumeAtAfterLoop(params);

    expect(resumeAt).toBeInstanceOf(Date);
    expect(resumeAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it('does not parse a templated YAML timeout when the rendered duration is persisted', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2025-06-01T12:00:15.000Z'));
      const params = makeParams();
      (params.workflowRuntime.getWorkflowExecution as Mock).mockReturnValue({
        id: 'exec-parent',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        startedAt: '2025-06-01T12:00:00.000Z',
        scopeStack: [],
      });
      (params.workflowRuntime.getCurrentNode as Mock).mockReturnValue({
        stepId: 'app',
        type: 'waitForApproval',
        configuration: { timeout: "{{ inputs.expiresIn | default: '72h' }}" },
      });
      (params.workflowExecutionState.getLatestStepExecution as Mock).mockReturnValue({
        startedAt: '2025-06-01T12:00:00.000Z',
        state: { dynamicTimeout: '30s' },
      });

      expect(getWorkflowIdleTimeoutResumeAtAfterLoop(params)?.getTime()).toBe(
        Date.parse('2025-06-01T12:00:30.000Z')
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ensureWorkflowIdleTimeoutResumeAfterLoop', () => {
  it('schedules the global-timeout resume task when execution is still waiting for input', async () => {
    const params = makeParams();
    (params.workflowRuntime.getWorkflowExecution as Mock).mockReturnValue({
      id: 'exec-parent',
      status: ExecutionStatus.WAITING_FOR_INPUT,
      startedAt: '2025-06-01T12:00:00.000Z',
      scopeStack: [],
    });
    (params.workflowRuntime.getCurrentNode as Mock).mockReturnValue({
      stepId: 'app',
      type: 'waitForApproval',
      configuration: { timeout: '24h' },
    });
    (params.workflowExecutionState.getLatestStepExecution as Mock).mockReturnValue({
      startedAt: '2025-06-01T12:00:00.000Z',
    });

    await ensureWorkflowIdleTimeoutResumeAfterLoop(params);

    expect(
      params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask
    ).toHaveBeenCalledTimes(1);
  });

  it('does nothing when execution is not waiting', async () => {
    const params = makeParams();
    (params.workflowRuntime.getWorkflowExecution as Mock).mockReturnValue({
      id: 'exec-parent',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-06-01T12:00:00.000Z',
      scopeStack: [],
    });

    await ensureWorkflowIdleTimeoutResumeAfterLoop(params);

    expect(
      params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask
    ).not.toHaveBeenCalled();
  });

  it('wakes the parent when re-arming WAITING_FOR_CHILD and the child is already terminal', async () => {
    const params = makeParams();
    (params.workflowRuntime.getWorkflowExecution as Mock).mockReturnValue({
      id: 'exec-parent',
      spaceId: 'default',
      status: ExecutionStatus.WAITING_FOR_CHILD,
      startedAt: '2025-06-01T12:00:00.000Z',
      scopeStack: [],
    });
    (params.workflowRuntime.getCurrentNode as Mock).mockReturnValue({
      stepId: 'run_child',
      type: WORKFLOW_EXECUTE_STEP_TYPE,
      stepType: WORKFLOW_EXECUTE_STEP_TYPE,
    });
    (params.workflowExecutionGraph.getWorkflowLevelTimeout as Mock).mockReturnValue('6h');
    (params.workflowExecutionState.getLatestStepExecution as Mock).mockReturnValue({
      startedAt: '2025-06-01T12:00:00.000Z',
      state: { executionId: 'child-exec-1' },
    });
    (params.workflowExecutionRepository.getWorkflowExecutionById as Mock).mockResolvedValue({
      id: 'child-exec-1',
      status: ExecutionStatus.COMPLETED,
    });

    await ensureWorkflowIdleTimeoutResumeAfterLoop(params);

    expect(params.workflowTaskManager.runExistingResumeTask).toHaveBeenCalledWith('exec-parent');
  });

  it('still handshakes when re-arm scheduling fails', async () => {
    const params = makeParams();
    (params.workflowRuntime.getWorkflowExecution as Mock).mockReturnValue({
      id: 'exec-parent',
      spaceId: 'default',
      status: ExecutionStatus.WAITING_FOR_CHILD,
      startedAt: '2025-06-01T12:00:00.000Z',
      scopeStack: [],
    });
    (params.workflowRuntime.getCurrentNode as Mock).mockReturnValue({
      stepId: 'run_child',
      type: WORKFLOW_EXECUTE_STEP_TYPE,
      stepType: WORKFLOW_EXECUTE_STEP_TYPE,
    });
    (params.workflowExecutionGraph.getWorkflowLevelTimeout as Mock).mockReturnValue('6h');
    (params.workflowExecutionState.getLatestStepExecution as Mock).mockReturnValue({
      startedAt: '2025-06-01T12:00:00.000Z',
      state: { executionId: 'child-exec-1' },
    });
    (
      params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask as Mock
    ).mockRejectedValue(new Error('timer schedule failed'));
    (params.workflowExecutionRepository.getWorkflowExecutionById as Mock).mockResolvedValue({
      id: 'child-exec-1',
      status: ExecutionStatus.COMPLETED,
    });

    await ensureWorkflowIdleTimeoutResumeAfterLoop(params);

    expect(params.workflowTaskManager.runExistingResumeTask).toHaveBeenCalledWith('exec-parent');
  });
});
