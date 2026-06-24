/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { extractParallelStepTelemetry } from './extract_parallel_step_telemetry';

const makeExecution = (
  steps: Array<Record<string, unknown>>,
  overrides: Partial<EsWorkflowExecution> = {}
): EsWorkflowExecution =>
  ({
    workflowId: 'wf-1',
    spaceId: 'default',
    isTestRun: false,
    workflowDefinition: { steps },
    ...overrides,
  } as unknown as EsWorkflowExecution);

const makeStepExecution = (overrides: Partial<EsWorkflowStepExecution>): EsWorkflowStepExecution =>
  ({ ...overrides } as EsWorkflowStepExecution);

describe('extractParallelStepTelemetry', () => {
  it('returns nothing when there are no parallel steps', () => {
    const execution = makeExecution([{ name: 'console_step', type: 'console' }]);
    const stepExecutions = [makeStepExecution({ stepId: 'console_step', stepType: 'console' })];
    expect(extractParallelStepTelemetry(execution, stepExecutions)).toEqual([]);
  });

  it('derives counts, status, and config from a completed parallel step', () => {
    const execution = makeExecution([
      {
        name: 'fan_out',
        type: 'parallel',
        foreach: '{{ x }}',
        concurrency: { max: 3, 'count-waiting': false },
        mode: 'settled',
        timeout: '5m',
        'branch-timeout': '30s',
        steps: [{ name: 'inner', type: 'console' }],
      },
    ]);
    const stepExecutions = [
      makeStepExecution({
        stepId: 'fan_out',
        stepType: 'parallel',
        output: {
          total: 3,
          succeeded: 3,
          failed: 0,
          status: 'completed',
          results: [{ status: 'completed' }, { status: 'completed' }, { status: 'completed' }],
        },
      }),
    ];

    const [telemetry] = extractParallelStepTelemetry(execution, stepExecutions);
    expect(telemetry).toEqual({
      workflowId: 'wf-1',
      spaceId: 'default',
      stepId: 'fan_out',
      isTestRun: false,
      total: 3,
      succeeded: 3,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      status: 'completed',
      concurrency: 3,
      countWaiting: false,
      mode: 'settled',
      hasExplicitConcurrency: true,
      hasTimeout: true,
      hasBranchTimeout: true,
    });
  });

  it('counts skipped and timed-out branches and reports failed status', () => {
    const execution = makeExecution([
      { name: 'fan_out', type: 'parallel', foreach: '{{ x }}', steps: [] },
    ]);
    const stepExecutions = [
      makeStepExecution({
        stepId: 'fan_out',
        stepType: 'parallel',
        output: {
          total: 4,
          succeeded: 1,
          failed: 2,
          status: 'failed',
          results: [
            { status: 'completed' },
            { status: 'failed' },
            { status: 'timed_out' },
            { status: 'skipped' },
          ],
        },
      }),
    ];

    const [telemetry] = extractParallelStepTelemetry(execution, stepExecutions);
    expect(telemetry).toMatchObject({
      total: 4,
      succeeded: 1,
      failed: 2,
      skipped: 1,
      timedOut: 1,
      status: 'failed',
      // No explicit concurrency -> defaults applied.
      hasExplicitConcurrency: false,
      countWaiting: true,
      mode: 'fail-fast',
      hasTimeout: false,
      hasBranchTimeout: false,
    });
  });

  it('finds a parallel step nested inside another control-flow step', () => {
    const execution = makeExecution([
      {
        name: 'loop',
        type: 'foreach',
        foreach: '{{ y }}',
        steps: [{ name: 'fan_out', type: 'parallel', foreach: '{{ x }}', concurrency: 7 }],
      },
    ]);
    const stepExecutions = [
      makeStepExecution({
        stepId: 'fan_out',
        stepType: 'parallel',
        output: {
          total: 1,
          succeeded: 1,
          failed: 0,
          status: 'completed',
          results: [{ status: 'completed' }],
        },
      }),
    ];

    const [telemetry] = extractParallelStepTelemetry(execution, stepExecutions);
    expect(telemetry).toMatchObject({ concurrency: 7, hasExplicitConcurrency: true });
  });
});
