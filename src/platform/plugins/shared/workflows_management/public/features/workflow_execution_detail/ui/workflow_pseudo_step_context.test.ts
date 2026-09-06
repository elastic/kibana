/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import {
  buildOverviewStepExecutionFromContext,
  buildTriggerContextFromExecution,
  buildTriggerStepExecutionFromContext,
  getAlertRuleLinkInfo,
} from './workflow_pseudo_step_context';

describe('buildTriggerContextFromExecution', () => {
  it('should return null when context is null', () => {
    expect(buildTriggerContextFromExecution(null)).toBeNull();
  });

  it('should return null when context is undefined', () => {
    expect(buildTriggerContextFromExecution(undefined)).toBeNull();
  });

  it('should return manual trigger type when context has no event', () => {
    const result = buildTriggerContextFromExecution({ inputs: { key: 'value' } });
    expect(result).toEqual({
      triggerType: 'manual',
      input: { key: 'value' },
    });
  });

  it('should return scheduled trigger type when event type is scheduled', () => {
    const event = { type: 'scheduled', data: 'test' };
    const result = buildTriggerContextFromExecution({ event });
    expect(result).toEqual({
      triggerType: 'scheduled',
      input: event,
    });
  });

  it('should return alert trigger type when event has alerts', () => {
    const event = { alerts: [{ id: 'alert-1' }] };
    const result = buildTriggerContextFromExecution({ event });
    expect(result).toEqual({
      triggerType: 'alert',
      input: event,
    });
  });

  it('should return document trigger type when event has no alerts and is not scheduled', () => {
    const event = { documents: [{ id: 'doc-1' }] };
    const result = buildTriggerContextFromExecution({ event });
    expect(result).toEqual({
      triggerType: 'document',
      input: event,
    });
  });

  it('should not treat custom provenance strings as event-driven without an event payload', () => {
    const result = buildTriggerContextFromExecution(
      { inputs: { query: 'gen' } },
      'attack-discovery-pipeline'
    );
    expect(result).toEqual({
      triggerType: 'manual',
      input: { query: 'gen' },
    });
  });

  it('should return event trigger type when triggeredBy from execution is event-driven', () => {
    const event = { workflow: { id: 'w1' } };
    const result = buildTriggerContextFromExecution({ event }, 'workflows.failed');
    expect(result).toEqual({
      triggerType: 'event',
      input: event,
    });
  });

  it('should use event as input when event is present', () => {
    const event = { alerts: [{ id: 'alert-1' }] };
    const result = buildTriggerContextFromExecution({ event, inputs: { ignored: true } });
    expect(result?.input).toEqual(event);
  });

  it('should use inputs as input when event is not present', () => {
    const result = buildTriggerContextFromExecution({ inputs: { foo: 'bar' } });
    expect(result?.input).toEqual({ foo: 'bar' });
  });

  it('should default to manual when context has neither event nor inputs', () => {
    const result = buildTriggerContextFromExecution({ spaceId: 'default' });
    expect(result).toEqual({
      triggerType: 'manual',
      input: undefined,
    });
  });
});

describe('buildTriggerStepExecutionFromContext', () => {
  const baseExecution: WorkflowExecutionDto = {
    spaceId: 'default',
    id: 'exec-1',
    status: ExecutionStatus.COMPLETED,
    error: null,
    isTestRun: false,
    startedAt: '2024-01-01T00:00:00Z',
    finishedAt: '2024-01-01T00:01:00Z',
    workflowId: 'wf-1',
    workflowName: 'Test',
    workflowDefinition: {} as WorkflowExecutionDto['workflowDefinition'],
    stepExecutions: [],
    duration: 60000,
    yaml: '',
  };

  const completedActionStep: WorkflowExecutionDto['stepExecutions'][number] = {
    id: 'step-1',
    stepId: 'action-1',
    stepType: 'action',
    status: ExecutionStatus.COMPLETED,
    scopeStack: [],
    workflowRunId: 'exec-1',
    workflowId: 'wf-1',
    startedAt: '',
    topologicalIndex: 0,
    globalExecutionIndex: 0,
    stepExecutionIndex: 0,
  };

  it('returns null when context is null', () => {
    expect(
      buildTriggerStepExecutionFromContext({
        ...baseExecution,
        context: null,
      } as unknown as WorkflowExecutionDto)
    ).toBeNull();
  });

  it('returns null when execution has no context', () => {
    expect(
      buildTriggerStepExecutionFromContext({
        ...baseExecution,
        context: undefined,
      })
    ).toBeNull();
  });

  it('sets output from context.output when present', () => {
    const output = { greeting: 'hello world', count: 42 };
    const result = buildTriggerStepExecutionFromContext({
      ...baseExecution,
      context: { inputs: {}, output },
    });
    expect(result).not.toBeNull();
    expect(result?.output).toEqual(output);
  });

  it('sets output to undefined when context has no output', () => {
    const result = buildTriggerStepExecutionFromContext({
      ...baseExecution,
      context: { inputs: { key: 'value' } },
    });
    expect(result).not.toBeNull();
    expect(result?.output).toBeUndefined();
  });

  it('builds trigger step with COMPLETED status for successful execution', () => {
    const result = buildTriggerStepExecutionFromContext({
      ...baseExecution,
      stepExecutions: [completedActionStep],
      context: { inputs: { name: 'test' } },
    });
    expect(result).not.toBeNull();
    expect(result?.status).toBe(ExecutionStatus.COMPLETED);
    expect(result?.error).toBeUndefined();
  });

  it('builds trigger step with FAILED status when execution failed before steps', () => {
    const result = buildTriggerStepExecutionFromContext({
      ...baseExecution,
      status: ExecutionStatus.FAILED,
      error: { type: 'InputValidationError', message: 'name: Required' },
      context: { inputs: {} },
    });
    expect(result).not.toBeNull();
    expect(result?.status).toBe(ExecutionStatus.FAILED);
    expect(result?.error).toEqual({ type: 'InputValidationError', message: 'name: Required' });
  });

  it('does not set FAILED on trigger step when execution failed after steps ran', () => {
    const result = buildTriggerStepExecutionFromContext({
      ...baseExecution,
      status: ExecutionStatus.FAILED,
      error: { type: 'StepError', message: 'step failed' },
      stepExecutions: [{ ...completedActionStep, status: ExecutionStatus.FAILED }],
      context: { inputs: { name: 'test' } },
    });
    expect(result).not.toBeNull();
    expect(result?.status).toBe(ExecutionStatus.COMPLETED);
    expect(result?.error).toBeUndefined();
  });

  it('sets stepId and stepType from the alert trigger type', () => {
    const result = buildTriggerStepExecutionFromContext({
      ...baseExecution,
      context: { event: { alerts: [{ id: 'a1' }] } },
    });
    expect(result?.stepId).toBe('alert');
    expect(result?.stepType).toBe('trigger_alert');
  });

  it('extracts the alert rule link information from execution context', () => {
    expect(
      getAlertRuleLinkInfo({
        ...baseExecution,
        context: {
          event: {
            alerts: [{ id: 'a1' }],
            rule: { id: 'rule-1', name: 'CPU rule' },
            ruleUrl: '/s/space-1/app/rules/rule/rule-1',
          },
        },
      })
    ).toEqual({
      id: 'rule-1',
      name: 'CPU rule',
      ruleUrl: '/s/space-1/app/rules/rule/rule-1',
    });
  });

  it('does not return rule link information for a non-alert execution', () => {
    expect(
      getAlertRuleLinkInfo({
        ...baseExecution,
        context: { event: { type: 'scheduled' } },
      })
    ).toBeUndefined();
  });

  it('sets trigger_event pseudo-step for event-driven execution', () => {
    const result = buildTriggerStepExecutionFromContext({
      ...baseExecution,
      triggeredBy: 'workflows.failed',
      context: { event: { error: { message: 'x' } } },
    });
    expect(result?.stepId).toBe('event');
    expect(result?.stepType).toBe('trigger_event');
  });

  it('exposes manual inputs as output when both event and inputs are present', () => {
    const result = buildTriggerStepExecutionFromContext({
      ...baseExecution,
      stepExecutions: [completedActionStep],
      context: {
        event: { alerts: [{ id: 'alert-1' }] },
        inputs: { ticketId: 'ABC-123' },
      },
    });
    expect(result).not.toBeNull();
    expect(result?.input).toEqual({ alerts: [{ id: 'alert-1' }] });
    expect(result?.output).toEqual({ ticketId: 'ABC-123' });
  });

  it('does not set output when only event is present', () => {
    const result = buildTriggerStepExecutionFromContext({
      ...baseExecution,
      stepExecutions: [completedActionStep],
      // The server always persists an `inputs` key (empty object when no manual inputs
      // were supplied alongside the event), so the realistic persisted shape includes it.
      context: { event: { alerts: [{ id: 'alert-1' }] }, inputs: {} },
    });
    expect(result).not.toBeNull();
    expect(result?.input).toEqual({ alerts: [{ id: 'alert-1' }] });
    expect(result?.output).toBeUndefined();
  });
});

describe('buildOverviewStepExecutionFromContext', () => {
  const baseOverviewExecution: WorkflowExecutionDto = {
    spaceId: 'default',
    id: 'exec-overview',
    status: ExecutionStatus.FAILED,
    error: { type: 'TaskRecoveryError', message: 'Resume interrupted' },
    isTestRun: false,
    startedAt: '2024-01-01T00:00:00Z',
    finishedAt: '2024-01-01T00:01:00Z',
    workflowId: 'wf-1',
    workflowName: 'Test',
    workflowDefinition: {} as WorkflowExecutionDto['workflowDefinition'],
    stepExecutions: [{ id: 's1' } as WorkflowExecutionDto['stepExecutions'][number]],
    duration: 60000,
    yaml: '',
    context: { inputs: {}, workflowRunId: 'run-1' },
  };

  it('adds executionError when execution.error is set and steps ran (no duplicate of trigger-only path)', () => {
    const overview = buildOverviewStepExecutionFromContext(baseOverviewExecution);
    const input = overview.input as Record<string, unknown>;
    expect(input.executionError).toEqual({
      type: 'TaskRecoveryError',
      message: 'Resume interrupted',
    });
    expect(input.workflowRunId).toBe('run-1');
  });

  it('omits executionError when failed before steps (trigger row carries execution.error)', () => {
    const overview = buildOverviewStepExecutionFromContext({
      ...baseOverviewExecution,
      stepExecutions: [],
    });
    const input = overview.input as Record<string, unknown>;
    expect(input.executionError).toBeUndefined();
  });

  it('omits executionError when error is null', () => {
    const overview = buildOverviewStepExecutionFromContext({
      ...baseOverviewExecution,
      error: null,
    });
    const input = overview.input as Record<string, unknown>;
    expect(input.executionError).toBeUndefined();
  });

  it('merges executionError with trace when both present', () => {
    const overview = buildOverviewStepExecutionFromContext({
      ...baseOverviewExecution,
      traceId: 'trace-abc',
      entryTransactionId: 'txn-xyz',
    });
    const input = overview.input as Record<string, unknown>;
    expect(input.trace).toEqual({
      traceId: 'trace-abc',
      entryTransactionId: 'txn-xyz',
    });
    expect(input.executionError).toEqual({
      type: 'TaskRecoveryError',
      message: 'Resume interrupted',
    });
  });

  it('surfaces skipReason on Overview when execution was skipped before steps ran', () => {
    const overview = buildOverviewStepExecutionFromContext({
      ...baseOverviewExecution,
      status: ExecutionStatus.SKIPPED,
      error: null,
      stepExecutions: [],
      context: { spaceId: 'default' },
      cancellationReason: 'Queue wait exceeded (queue-ttl: 1s)',
    } as WorkflowExecutionDto & { cancellationReason: string });
    const input = overview.input as Record<string, unknown>;
    expect(input.skipReason).toBe('Queue wait exceeded (queue-ttl: 1s)');
    expect(input.spaceId).toBe('default');
  });

  it('omits skipReason on Overview when status is not skipped', () => {
    const overview = buildOverviewStepExecutionFromContext({
      ...baseOverviewExecution,
      cancellationReason: 'Cancelled by user',
    } as WorkflowExecutionDto & { cancellationReason: string });
    const input = overview.input as Record<string, unknown>;
    expect(input.skipReason).toBeUndefined();
  });

  it('includes workflow.version in overview input when present on the execution', () => {
    const overview = buildOverviewStepExecutionFromContext({
      ...baseOverviewExecution,
      version: 4,
      context: {
        workflow: {
          id: 'wf-1',
          name: 'Test',
          enabled: false,
          spaceId: 'default',
        },
      },
    });
    const input = overview.input as Record<string, unknown>;
    expect(input.workflow).toEqual({
      id: 'wf-1',
      name: 'Test',
      enabled: false,
      spaceId: 'default',
      version: 4,
    });
  });

  it('omits workflow.version from overview input when absent on the execution', () => {
    const overview = buildOverviewStepExecutionFromContext({
      ...baseOverviewExecution,
      context: {
        workflow: {
          id: 'wf-1',
          name: 'Test',
          enabled: false,
          spaceId: 'default',
        },
      },
    });
    const input = overview.input as Record<string, unknown>;
    expect(input.workflow).toEqual({
      id: 'wf-1',
      name: 'Test',
      enabled: false,
      spaceId: 'default',
    });
  });

  it('preserves workflow.version already stored in execution context', () => {
    const overview = buildOverviewStepExecutionFromContext({
      ...baseOverviewExecution,
      version: 9,
      context: {
        workflow: {
          id: 'wf-1',
          name: 'Test',
          enabled: false,
          spaceId: 'default',
          version: 2,
        },
      },
    });
    const input = overview.input as Record<string, unknown>;
    expect((input.workflow as Record<string, unknown>).version).toBe(2);
  });
});
