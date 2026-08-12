/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { getFailedStepPosition } from './get_failed_step_position';

const step = (
  partial: Partial<WorkflowStepExecutionDto> & Pick<WorkflowStepExecutionDto, 'id' | 'stepId'>
): WorkflowStepExecutionDto =>
  ({
    stepType: 'console',
    status: ExecutionStatus.COMPLETED,
    scopeStack: [],
    workflowRunId: 'run',
    workflowId: 'wf',
    startedAt: '',
    globalExecutionIndex: 0,
    stepExecutionIndex: 0,
    topologicalIndex: 0,
    ...partial,
  }) as WorkflowStepExecutionDto;

describe('getFailedStepPosition', () => {
  it('returns null for non-failed executions', () => {
    const execution = {
      status: ExecutionStatus.COMPLETED,
      stepExecutions: [step({ id: '1', stepId: 'a' })],
    } as WorkflowExecutionDto;
    expect(getFailedStepPosition(execution)).toBeNull();
  });

  it('returns 1-based index among top-level steps', () => {
    const failed = step({
      id: '2',
      stepId: 'b',
      status: ExecutionStatus.FAILED,
      error: { type: 'Error', message: 'boom' },
    });
    const execution = {
      status: ExecutionStatus.FAILED,
      stepExecutions: [
        step({ id: '1', stepId: 'a' }),
        failed,
        step({ id: '3', stepId: 'c', status: ExecutionStatus.PENDING }),
      ],
    } as WorkflowExecutionDto;
    expect(getFailedStepPosition(execution)).toEqual({
      step: failed,
      index: 2,
      total: 3,
    });
  });

  it('ignores nested scope steps when numbering', () => {
    const failed = step({
      id: 'nested',
      stepId: 'inner',
      status: ExecutionStatus.FAILED,
      scopeStack: [{ stepId: 'foreach', nestedLevel: 0 }],
    });
    const execution = {
      status: ExecutionStatus.FAILED,
      stepExecutions: [step({ id: '1', stepId: 'outer' }), failed],
    } as WorkflowExecutionDto;
    expect(getFailedStepPosition(execution)).toBeNull();
  });
});
