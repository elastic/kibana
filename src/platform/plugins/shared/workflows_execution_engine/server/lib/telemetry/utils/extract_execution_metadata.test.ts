/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import {
  extractAlertRuleId,
  extractCompositionContext,
  extractExecutionMetadata,
  extractQueueDelayMs,
  extractTimeToFirstStep,
} from './extract_execution_metadata';

const createMockWorkflowExecution = (
  overrides?: Partial<EsWorkflowExecution>
): EsWorkflowExecution => ({
  id: 'exec-1',
  workflowId: 'wf-1',
  spaceId: 'default',
  isTestRun: false,
  status: ExecutionStatus.COMPLETED,
  context: {},
  workflowDefinition: {
    steps: [{ name: 's1', type: 'console' }],
    triggers: [{ type: 'manual' }],
  } as Partial<WorkflowYaml> as WorkflowYaml,
  yaml: '',
  scopeStack: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  error: null,
  createdBy: 'user',
  startedAt: '2024-01-01T00:00:00.000Z',
  finishedAt: '2024-01-01T00:01:00.000Z',
  cancelRequested: false,
  duration: 60000,
  triggeredBy: 'manual',
  ...overrides,
});

const createMockStepExecution = (
  overrides?: Partial<EsWorkflowStepExecution>
): EsWorkflowStepExecution => ({
  id: 'step-exec-1',
  stepId: 'step-a',
  stepType: 'console',
  spaceId: 'default',
  scopeStack: [],
  workflowRunId: 'exec-1',
  workflowId: 'wf-1',
  status: ExecutionStatus.COMPLETED,
  startedAt: '2024-01-01T00:00:05.000Z',
  finishedAt: '2024-01-01T00:00:10.000Z',
  executionTimeMs: 5000,
  topologicalIndex: 0,
  globalExecutionIndex: 0,
  stepExecutionIndex: 0,
  ...overrides,
});

/** Minimal fixture: extractCompositionContext only reads triggeredBy and context. */
function compositionFixture(
  triggeredBy: string,
  context: Record<string, unknown>
): EsWorkflowExecution {
  return { triggeredBy, context } as unknown as EsWorkflowExecution;
}

describe('extractExecutionMetadata', () => {
  it('aggregates step status counts and connector types', () => {
    const wfExec = createMockWorkflowExecution();
    const steps = [
      createMockStepExecution({
        id: '1',
        stepId: 'a',
        status: ExecutionStatus.COMPLETED,
        stepType: 'slack.postMessage',
      }),
      createMockStepExecution({
        id: '2',
        stepId: 'b',
        status: ExecutionStatus.FAILED,
        stepType: 'console',
      }),
      createMockStepExecution({
        id: '3',
        stepId: 'c',
        status: ExecutionStatus.SKIPPED,
        stepType: 'if',
      }),
    ];
    const meta = extractExecutionMetadata(wfExec, steps);
    expect(meta).toMatchObject({
      executedStepCount: 3,
      successfulStepCount: 1,
      failedStepCount: 1,
      skippedStepCount: 1,
      executedConnectorTypes: ['slack'],
      uniqueStepIdsExecuted: 3,
      maxExecutionDepth: 0,
      hasRetries: false,
    });
  });

  it('detects retries when the same stepId appears more than once', () => {
    const wfExec = createMockWorkflowExecution();
    const steps = [
      createMockStepExecution({ id: '1', stepId: 'same' }),
      createMockStepExecution({ id: '2', stepId: 'same' }),
    ];
    expect(extractExecutionMetadata(wfExec, steps).hasRetries).toBe(true);
  });

  it('computes maxExecutionDepth from scopeStack length', () => {
    const wfExec = createMockWorkflowExecution();
    const steps = [
      createMockStepExecution({
        scopeStack: [
          {
            stepId: 'outer',
            nestedScopes: [{ nodeId: 'n1', nodeType: 'foreach' }],
          },
        ],
      }),
      createMockStepExecution({
        scopeStack: [
          {
            stepId: 'outer',
            nestedScopes: [{ nodeId: 'n1', nodeType: 'foreach' }],
          },
          {
            stepId: 'inner',
            nestedScopes: [],
          },
        ],
      }),
    ];
    expect(extractExecutionMetadata(wfExec, steps).maxExecutionDepth).toBe(2);
  });

  it('sets hasErrorHandling when steps failed but workflow did not fail or cancel', () => {
    const wfOk = createMockWorkflowExecution({ status: ExecutionStatus.COMPLETED });
    const wfFailed = createMockWorkflowExecution({ status: ExecutionStatus.FAILED });
    const wfCancelled = createMockWorkflowExecution({ status: ExecutionStatus.CANCELLED });
    const steps = [
      createMockStepExecution({ id: '1', status: ExecutionStatus.FAILED }),
      createMockStepExecution({ id: '2', status: ExecutionStatus.COMPLETED }),
    ];
    expect(extractExecutionMetadata(wfOk, steps).hasErrorHandling).toBe(true);
    expect(extractExecutionMetadata(wfFailed, steps).hasErrorHandling).toBe(false);
    expect(extractExecutionMetadata(wfCancelled, steps).hasErrorHandling).toBe(false);
  });

  it('includes ruleId, queue delay, time to first step, timeout fields when applicable', () => {
    const wfDef = {
      steps: [{ name: 's1', type: 'console' }],
      triggers: [{ type: 'manual' }],
      settings: { timeout: '1m' },
    } as Partial<WorkflowYaml> as WorkflowYaml;

    const wfExec = createMockWorkflowExecution({
      triggeredBy: 'alert',
      status: ExecutionStatus.TIMED_OUT,
      startedAt: '2024-01-01T00:00:00.000Z',
      finishedAt: '2024-01-01T00:01:30.000Z',
      duration: 90000,
      context: {
        event: { type: 'alert', rule: { id: 'rule-xyz' } },
      },
      queueMetrics: {
        startedAt: '2024-01-01T00:00:00.000Z',
        queueDelayMs: 42,
        scheduleDelayMs: null,
      },
      workflowDefinition: wfDef,
    });

    const steps = [
      createMockStepExecution({
        startedAt: '2024-01-01T00:00:10.000Z',
        executionTimeMs: 100,
        stepType: 'elasticsearch.search',
      }),
      createMockStepExecution({
        id: 'se2',
        stepId: 'step-b',
        startedAt: '2024-01-01T00:00:20.000Z',
        executionTimeMs: 300,
        stepType: 'elasticsearch.search',
      }),
    ];

    const meta = extractExecutionMetadata(wfExec, steps);
    expect(meta.ruleId).toBe('rule-xyz');
    expect(meta.queueDelayMs).toBe(42);
    expect(meta.timeToFirstStep).toBe(10000);
    expect(meta.timedOut).toBe(true);
    expect(meta.timeoutMs).toBe(60000);
    expect(meta.timeoutExceededByMs).toBe(30000);
    expect(meta.stepDurations).toHaveLength(2);
    expect(meta.stepAvgDurationsByType).toEqual({ elasticsearch_search: 200 });
  });

  it('omits optional execution fields when there is nothing to report', () => {
    const wfExec = createMockWorkflowExecution();
    const meta = extractExecutionMetadata(wfExec, []);
    expect(meta.ruleId).toBeUndefined();
    expect(meta.queueDelayMs).toBeUndefined();
    expect(meta.timeToFirstStep).toBeUndefined();
    expect(meta.stepDurations).toBeUndefined();
    expect(meta.stepAvgDurationsByType).toBeUndefined();
    expect(meta.timeoutMs).toBeUndefined();
    expect(meta.timeoutExceededByMs).toBeUndefined();
  });
});

describe('extractAlertRuleId', () => {
  const baseExec = (overrides?: Partial<EsWorkflowExecution>): EsWorkflowExecution => ({
    id: 'e',
    workflowId: 'w',
    spaceId: 'default',
    isTestRun: false,
    status: ExecutionStatus.COMPLETED,
    context: {},
    workflowDefinition: { steps: [], triggers: [] } as Partial<WorkflowYaml> as WorkflowYaml,
    yaml: '',
    scopeStack: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    error: null,
    startedAt: '2024-01-01T00:00:00.000Z',
    finishedAt: '2024-01-01T00:00:01.000Z',
    cancelRequested: false,
    duration: 1000,
    triggeredBy: 'manual',
    ...overrides,
  });

  it('returns undefined when not triggered by alert', () => {
    expect(extractAlertRuleId(baseExec())).toBeUndefined();
  });

  it('returns rule id from context when triggered by alert', () => {
    expect(
      extractAlertRuleId(
        baseExec({
          triggeredBy: 'alert',
          context: { event: { type: 'alert', rule: { id: 'r1' } } },
        })
      )
    ).toBe('r1');
  });

  it('returns undefined when event type or rule id is missing', () => {
    expect(
      extractAlertRuleId(
        baseExec({
          triggeredBy: 'alert',
          context: { event: { type: 'signal', rule: { id: 'r1' } } },
        })
      )
    ).toBeUndefined();
  });
});

describe('extractTimeToFirstStep', () => {
  const wfExec: EsWorkflowExecution = {
    id: 'e',
    workflowId: 'w',
    spaceId: 'default',
    isTestRun: false,
    status: ExecutionStatus.RUNNING,
    context: {},
    workflowDefinition: { steps: [], triggers: [] } as Partial<WorkflowYaml> as WorkflowYaml,
    yaml: '',
    scopeStack: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    error: null,
    startedAt: '2024-01-01T00:00:00.000Z',
    finishedAt: '2024-01-01T00:00:01.000Z',
    cancelRequested: false,
    duration: 1000,
    triggeredBy: 'manual',
  };

  it('returns undefined when there are no steps', () => {
    expect(extractTimeToFirstStep(wfExec, [])).toBeUndefined();
  });

  it('returns delta from workflow start to earliest step start', () => {
    const steps = [
      createMockStepExecution({
        stepId: 'late',
        startedAt: '2024-01-01T00:00:20.000Z',
      }),
      createMockStepExecution({
        id: 'se2',
        stepId: 'early',
        startedAt: '2024-01-01T00:00:05.000Z',
      }),
    ];
    expect(extractTimeToFirstStep(wfExec, steps)).toBe(5000);
  });
});

describe('extractQueueDelayMs', () => {
  const baseExec = (overrides?: Partial<EsWorkflowExecution>): EsWorkflowExecution => ({
    id: 'e',
    workflowId: 'w',
    spaceId: 'default',
    isTestRun: false,
    status: ExecutionStatus.COMPLETED,
    context: {},
    workflowDefinition: { steps: [], triggers: [] } as Partial<WorkflowYaml> as WorkflowYaml,
    yaml: '',
    scopeStack: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    error: null,
    startedAt: '2024-01-01T00:00:10.000Z',
    finishedAt: '2024-01-01T00:00:11.000Z',
    cancelRequested: false,
    duration: 1000,
    triggeredBy: 'manual',
    ...overrides,
  });

  it('prefers queueMetrics.queueDelayMs when set', () => {
    expect(
      extractQueueDelayMs(
        baseExec({
          queueMetrics: {
            startedAt: '2024-01-01T00:00:10.000Z',
            queueDelayMs: 99,
            scheduleDelayMs: null,
          },
        })
      )
    ).toBe(99);
  });

  it('derives delay from taskRunAt and startedAt for scheduled runs', () => {
    expect(
      extractQueueDelayMs(
        baseExec({
          triggeredBy: 'scheduled',
          taskRunAt: '2024-01-01T00:00:00.000Z',
          startedAt: '2024-01-01T00:00:15.000Z',
        })
      )
    ).toBe(15000);
  });

  it('returns undefined for negative scheduled delay', () => {
    expect(
      extractQueueDelayMs(
        baseExec({
          triggeredBy: 'scheduled',
          taskRunAt: '2024-01-01T00:01:00.000Z',
          startedAt: '2024-01-01T00:00:00.000Z',
        })
      )
    ).toBeUndefined();
  });
});

describe('extractCompositionContext', () => {
  it('returns empty object when not triggered by workflow-step', () => {
    expect(extractCompositionContext(compositionFixture('manual', {}))).toEqual({});
  });

  it('returns compositionDepth, parentWorkflowId, and parentWorkflowInvocation when set', () => {
    expect(
      extractCompositionContext(
        compositionFixture('workflow-step', {
          parentDepth: 0,
          parentWorkflowId: 'parent-wf-id',
          parentWorkflowInvocation: 'sync',
        })
      )
    ).toEqual({
      compositionDepth: 1,
      parentWorkflowId: 'parent-wf-id',
      parentWorkflowInvocation: 'sync',
    });
  });

  it('includes parentWorkflowInvocation async', () => {
    expect(
      extractCompositionContext(
        compositionFixture('workflow-step', {
          parentDepth: 0,
          parentWorkflowInvocation: 'async',
        })
      )
    ).toEqual({ compositionDepth: 1, parentWorkflowInvocation: 'async' });
  });

  it('uses compositionDepth 1 when parentDepth is not a number', () => {
    expect(
      extractCompositionContext(
        compositionFixture('workflow-step', {
          parentDepth: 'invalid',
          parentWorkflowId: 'parent-wf-id',
        })
      )
    ).toEqual({ compositionDepth: 1, parentWorkflowId: 'parent-wf-id' });
  });

  it('omits parentWorkflowId when empty string', () => {
    expect(
      extractCompositionContext(
        compositionFixture('workflow-step', {
          parentDepth: 0,
          parentWorkflowId: '',
        })
      )
    ).toEqual({ compositionDepth: 1 });
  });

  it('omits parentWorkflowId when not a string', () => {
    expect(
      extractCompositionContext(
        compositionFixture('workflow-step', {
          parentDepth: 0,
          parentWorkflowId: 123,
        })
      )
    ).toEqual({ compositionDepth: 1 });
  });
});
