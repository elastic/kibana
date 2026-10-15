/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { buildDiagnosisContextPackage } from './build_diagnosis_context_package';

const step = (
  partial: Partial<WorkflowStepExecutionDto> & Pick<WorkflowStepExecutionDto, 'id' | 'stepId'>
): WorkflowStepExecutionDto =>
  ({
    stepType: 'console',
    status: ExecutionStatus.FAILED,
    scopeStack: [],
    workflowRunId: 'run',
    workflowId: 'wf',
    startedAt: '',
    globalExecutionIndex: 0,
    stepExecutionIndex: 0,
    topologicalIndex: 0,
    ...partial,
  } as WorkflowStepExecutionDto);

describe('buildDiagnosisContextPackage', () => {
  const definition = {
    name: 'wf',
    steps: [
      { name: 'prep', type: 'console', with: { message: 'hi' } },
      {
        name: 'http_call',
        type: 'kibana.request',
        with: { method: 'GET', path: '/api/status' },
      },
    ],
  } as WorkflowYaml;

  it('includes core fields and omits attempt history for a plain failure', () => {
    const failed = step({
      id: 'exec-1',
      stepId: 'http_call',
      error: { type: 'Error', message: 'ECONNREFUSED' },
      input: { method: 'GET', path: '/api/status' },
    });

    expect(
      buildDiagnosisContextPackage({
        failedStep: failed,
        allStepExecutions: [failed],
        definition,
        workflowId: 'wf-1',
        executionId: 'run-1',
      })
    ).toEqual({
      error: { type: 'Error', message: 'ECONNREFUSED' },
      stepInput: { method: 'GET', path: '/api/status' },
      stepYaml: definition.steps[1],
      workflowId: 'wf-1',
      executionId: 'run-1',
      stepId: 'http_call',
    });
  });

  it('includes attempt history for a retried failure', () => {
    const attempt1 = step({
      id: 'a1',
      stepId: 'http_call',
      status: ExecutionStatus.FAILED,
      error: { type: 'Error', message: 'first' },
      executionTimeMs: 10,
      globalExecutionIndex: 1,
      stepExecutionIndex: 0,
      scopeStack: [
        {
          stepId: 'http_call',
          nestedScopes: [{ nodeId: 'enterRetry', nodeType: 'enter-retry', scopeId: '1-attempt' }],
        },
      ],
    });
    const attempt2 = step({
      id: 'a2',
      stepId: 'http_call',
      status: ExecutionStatus.FAILED,
      error: { type: 'Error', message: 'last' },
      executionTimeMs: 20,
      globalExecutionIndex: 2,
      stepExecutionIndex: 1,
      input: { method: 'GET' },
      scopeStack: [
        {
          stepId: 'http_call',
          nestedScopes: [{ nodeId: 'enterRetry', nodeType: 'enter-retry', scopeId: '2-attempt' }],
        },
      ],
    });

    const pkg = buildDiagnosisContextPackage({
      failedStep: attempt2,
      allStepExecutions: [attempt1, attempt2],
      definition,
      workflowId: 'wf-1',
      executionId: 'run-1',
    });

    expect(pkg.attemptHistory).toEqual([
      {
        attemptNumber: 1,
        status: ExecutionStatus.FAILED,
        durationMs: 10,
        error: { type: 'Error', message: 'first' },
      },
      {
        attemptNumber: 2,
        status: ExecutionStatus.FAILED,
        durationMs: 20,
        error: { type: 'Error', message: 'last' },
      },
    ]);
    expect(pkg.error).toEqual({ type: 'Error', message: 'last' });
    expect(pkg.stepInput).toEqual({ method: 'GET' });
    expect(pkg.stepYaml).toEqual(definition.steps[1]);
    expect(pkg.workflowId).toBe('wf-1');
    expect(pkg.executionId).toBe('run-1');
    expect(pkg.stepId).toBe('http_call');
  });
});
