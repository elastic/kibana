/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ExecutionStatus } from '@kbn/workflows';
import {
  getExecutionForTaskRunEvent,
  mapExecutionStatusToOutcome,
  mapInterruptCompleteReasonToOutcome,
  stampWorkflowTaskRunEventFields,
} from './workflow_task_run_event_fields';

describe('mapExecutionStatusToOutcome', () => {
  it.each([
    [ExecutionStatus.COMPLETED, 'completed'],
    [ExecutionStatus.SKIPPED, 'skipped'],
    [ExecutionStatus.FAILED, 'failed'],
    [ExecutionStatus.TIMED_OUT, 'failed'],
    [ExecutionStatus.CANCELLED, 'cancelled'],
  ] as const)('maps %s to %s', (status, outcome) => {
    expect(mapExecutionStatusToOutcome(status)).toBe(outcome);
  });

  it.each([
    ExecutionStatus.PENDING,
    ExecutionStatus.WAITING,
    ExecutionStatus.WAITING_FOR_INPUT,
    ExecutionStatus.WAITING_FOR_CHILD,
    ExecutionStatus.RUNNING,
    ExecutionStatus.QUEUED,
  ])('returns undefined for non-terminal status %s', (status) => {
    expect(mapExecutionStatusToOutcome(status)).toBeUndefined();
  });
});

describe('mapInterruptCompleteReasonToOutcome', () => {
  const base = {
    id: 'e1',
    workflowId: 'w1',
    spaceId: 'default',
  };

  it('returns interrupted for interrupted reason', () => {
    expect(
      mapInterruptCompleteReasonToOutcome('interrupted', {
        ...base,
        status: ExecutionStatus.FAILED,
      } as never)
    ).toBe('interrupted');
  });

  it('maps terminal noop status', () => {
    expect(
      mapInterruptCompleteReasonToOutcome('noop', {
        ...base,
        status: ExecutionStatus.COMPLETED,
      } as never)
    ).toBe('completed');
  });

  it('returns undefined for non-terminal noop status', () => {
    expect(
      mapInterruptCompleteReasonToOutcome('noop', {
        ...base,
        status: ExecutionStatus.WAITING_FOR_INPUT,
      } as never)
    ).toBeUndefined();
  });
});

describe('stampWorkflowTaskRunEventFields', () => {
  it('calls setCustomTaskRunEventFields with the full field set', () => {
    const setCustomTaskRunEventFields = jest.fn();

    stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
      workflow_execution_id: 'exec-1',
      workflow_id: 'wf-1',
      space_id: 'default',
      outcome: 'completed',
    });

    expect(setCustomTaskRunEventFields).toHaveBeenCalledTimes(1);
    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_execution_id: 'exec-1',
      workflow_id: 'wf-1',
      space_id: 'default',
      outcome: 'completed',
    });
  });

  it('omits optional ids when not provided', () => {
    const setCustomTaskRunEventFields = jest.fn();

    stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
      space_id: 'default',
      outcome: 'queued_deleted',
      workflow_id: 'wf-1',
    });

    expect(setCustomTaskRunEventFields).toHaveBeenCalledWith({
      workflow_id: 'wf-1',
      space_id: 'default',
      outcome: 'queued_deleted',
    });
  });
});

describe('getExecutionForTaskRunEvent', () => {
  it('returns the execution when the repository succeeds', async () => {
    const execution = {
      id: 'exec-1',
      workflowId: 'wf-1',
      spaceId: 'default',
      status: ExecutionStatus.COMPLETED,
    };
    const workflowExecutionRepository = {
      getWorkflowExecutionById: jest.fn().mockResolvedValue(execution),
    };

    await expect(
      getExecutionForTaskRunEvent(workflowExecutionRepository as never, 'exec-1', 'default')
    ).resolves.toEqual(execution);
  });

  it('returns null when the repository throws', async () => {
    const workflowExecutionRepository = {
      getWorkflowExecutionById: jest.fn().mockRejectedValue(new Error('es down')),
    };
    const logger = loggingSystemMock.createLogger();

    await expect(
      getExecutionForTaskRunEvent(workflowExecutionRepository as never, 'exec-1', 'default', logger)
    ).resolves.toBeNull();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load workflow execution exec-1')
    );
  });
});
