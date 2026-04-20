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

  it('returns null when context is null', () => {
    expect(
      buildTriggerStepExecutionFromContext({
        ...baseExecution,
        context: null,
      } as unknown as WorkflowExecutionDto)
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

  it('sets trigger_event pseudo-step for event-driven execution', () => {
    const result = buildTriggerStepExecutionFromContext({
      ...baseExecution,
      triggeredBy: 'workflows.failed',
      context: { event: { error: { message: 'x' } } },
    });
    expect(result?.stepId).toBe('event');
    expect(result?.stepType).toBe('trigger_event');
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
});
