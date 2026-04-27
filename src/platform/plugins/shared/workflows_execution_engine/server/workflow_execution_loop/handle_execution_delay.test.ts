/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { handleExecutionDelay } from './handle_execution_delay';
import type { WorkflowExecutionLoopParams } from './types';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';

const makeParams = (): jest.Mocked<WorkflowExecutionLoopParams> =>
  ({
    workflowRuntime: {
      getWorkflowExecution: jest.fn().mockReturnValue({ id: 'exec-1' }),
    },
    workflowExecutionState: {
      updateWorkflowExecution: jest.fn(),
    },
    workflowTaskManager: {
      scheduleResumeTask: jest.fn().mockResolvedValue(undefined),
    },
    fakeRequest: {},
  } as unknown as jest.Mocked<WorkflowExecutionLoopParams>);

const makeStepRuntime = (
  overrides: Partial<StepExecutionRuntime> = {}
): jest.Mocked<StepExecutionRuntime> =>
  ({
    stepExecution: undefined,
    abortController: new AbortController(),
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
});
