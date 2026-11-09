/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
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
  } as WorkflowStepExecutionDto);

const definition = (names: string[]): WorkflowYaml =>
  ({
    name: 'wf',
    steps: names.map((name) => ({ name, type: 'console' })),
  } as WorkflowYaml);

describe('getFailedStepPosition', () => {
  it('returns null for non-failed executions', () => {
    const execution = {
      status: ExecutionStatus.COMPLETED,
      stepExecutions: [step({ id: '1', stepId: 'a' })],
    } as WorkflowExecutionDto;
    expect(getFailedStepPosition(execution, definition(['a']))).toBeNull();
  });

  it('returns 1-based index among definition top-level steps', () => {
    const failed = step({
      id: '2',
      stepId: 'triage_overview',
      status: ExecutionStatus.FAILED,
      error: { type: 'Error', message: 'boom' },
      globalExecutionIndex: 1,
    });
    const execution = {
      status: ExecutionStatus.FAILED,
      stepExecutions: [step({ id: '1', stepId: 'start', globalExecutionIndex: 0 }), failed],
    } as WorkflowExecutionDto;
    expect(
      getFailedStepPosition(
        execution,
        definition(['start', 'mid', 'triage_overview', 'process_alerts', 'final_summary', 'done'])
      )
    ).toEqual({
      step: failed,
      index: 3,
      total: 6,
    });
  });

  it('numbers retry-scoped failures against the owning definition step', () => {
    const failedAttempt = step({
      id: 'attempt-4',
      stepId: 'triage_agent',
      status: ExecutionStatus.FAILED,
      error: { type: 'Error', message: 'boom' },
      globalExecutionIndex: 3,
      scopeStack: [
        {
          stepId: 'triage_agent',
          nestedScopes: [
            {
              nodeId: 'enterRetry_triage_agent',
              nodeType: 'enter-retry',
              scopeId: '4-attempt',
            },
          ],
        },
      ],
    });
    const execution = {
      status: ExecutionStatus.FAILED,
      stepExecutions: [failedAttempt],
    } as WorkflowExecutionDto;

    expect(
      getFailedStepPosition(
        execution,
        definition(['start', 'triage_agent', 'process_alerts', 'final_summary', 'done'])
      )
    ).toEqual({
      step: failedAttempt,
      index: 2,
      total: 5,
    });
  });

  it('targets the latest failed attempt when multiple retries failed', () => {
    const first = step({
      id: 'attempt-1',
      stepId: 'http_call',
      status: ExecutionStatus.FAILED,
      error: { type: 'Error', message: 'first' },
      globalExecutionIndex: 1,
      scopeStack: [
        {
          stepId: 'http_call',
          nestedScopes: [{ nodeId: 'enterRetry', nodeType: 'enter-retry', scopeId: '1-attempt' }],
        },
      ],
    });
    const last = step({
      id: 'attempt-4',
      stepId: 'http_call',
      status: ExecutionStatus.FAILED,
      error: { type: 'Error', message: 'last' },
      globalExecutionIndex: 4,
      scopeStack: [
        {
          stepId: 'http_call',
          nestedScopes: [{ nodeId: 'enterRetry', nodeType: 'enter-retry', scopeId: '4-attempt' }],
        },
      ],
    });
    const execution = {
      status: ExecutionStatus.FAILED,
      stepExecutions: [first, last],
    } as WorkflowExecutionDto;

    expect(getFailedStepPosition(execution, definition(['prep', 'http_call', 'after']))).toEqual({
      step: last,
      index: 2,
      total: 3,
    });
  });

  it('numbers nested control-flow failures against the top-level owner step', () => {
    const nestedFailed = step({
      id: 'nested',
      stepId: 'inner',
      status: ExecutionStatus.FAILED,
      error: { type: 'Error', message: 'boom' },
      globalExecutionIndex: 2,
      scopeStack: [
        {
          stepId: 'loop',
          nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'foreach', scopeId: '0' }],
        },
      ],
    });
    const execution = {
      status: ExecutionStatus.FAILED,
      stepExecutions: [
        step({ id: '1', stepId: 'prep', globalExecutionIndex: 0 }),
        step({
          id: '2',
          stepId: 'loop',
          stepType: 'foreach',
          status: ExecutionStatus.COMPLETED,
          globalExecutionIndex: 1,
        }),
        nestedFailed,
      ],
    } as WorkflowExecutionDto;

    expect(getFailedStepPosition(execution, definition(['prep', 'loop', 'after']))).toEqual({
      step: nestedFailed,
      index: 2,
      total: 3,
    });
  });

  it('returns plain Failed when the owning step is not in the definition', () => {
    const failed = step({
      id: 'nested',
      stepId: 'inner',
      status: ExecutionStatus.FAILED,
      scopeStack: [
        {
          stepId: 'missing-parent',
          nestedScopes: [
            {
              nodeId: 'enterRetry_x',
              nodeType: 'enter-retry',
              scopeId: '1-attempt',
            },
          ],
        },
      ],
    });
    const execution = {
      status: ExecutionStatus.FAILED,
      stepExecutions: [failed],
    } as WorkflowExecutionDto;
    expect(getFailedStepPosition(execution, definition(['outer']))).toEqual({ step: failed });
  });
});
