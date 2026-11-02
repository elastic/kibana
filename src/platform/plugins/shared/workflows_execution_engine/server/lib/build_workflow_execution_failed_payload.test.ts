/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { WORKFLOW_EXECUTION_FAILED_TRIGGER_ID } from '@kbn/workflows-extensions/server';
import { buildWorkflowExecutionFailedPayload } from './build_workflow_execution_failed_payload';

const baseExecution: EsWorkflowExecution = {
  id: 'exec-123',
  workflowId: 'wf-456',
  spaceId: 'default',
  isTestRun: false,
  status: 'failed',
  context: {},
  workflowDefinition: {
    name: 'My Workflow',
    version: '1',
    enabled: true,
    inputs: [],
    consts: {},
    triggers: [],
    steps: [],
  },
  yaml: '',
  scopeStack: [],
  createdAt: '2024-01-01T10:00:00.000Z',
  startedAt: '2024-01-01T10:00:00.000Z',
  finishedAt: '2024-01-01T10:05:00.000Z',
  createdBy: 'system',
  duration: 300000,
  error: { type: 'Error', message: 'General error' },
  cancelRequested: false,
  triggeredBy: 'manual',
} as EsWorkflowExecution;

describe('buildWorkflowExecutionFailedPayload', () => {
  it('builds payload with failedStepContext and sets isErrorHandler to false when triggeredBy is not error trigger', () => {
    const failedStepContext = {
      stepId: 'step_1',
      stepName: 'Send HTTP request',
      stepExecutionId: 'step-exec-abc',
    };
    const payload = buildWorkflowExecutionFailedPayload(baseExecution, failedStepContext);

    expect(payload.workflow).toEqual({
      id: 'wf-456',
      name: 'My Workflow',
      spaceId: 'default',
      isErrorHandler: false,
    });
    expect(payload.execution).toEqual({
      id: 'exec-123',
      startedAt: '2024-01-01T10:00:00.000Z',
      failedAt: '2024-01-01T10:05:00.000Z',
    });
    expect(payload.error).toEqual({
      message: 'General error',
      stepId: 'step_1',
      stepName: 'Send HTTP request',
      stepExecutionId: 'step-exec-abc',
    });
  });

  it('sets isErrorHandler to true when execution was triggered by workflows.failed', () => {
    const execution: EsWorkflowExecution = {
      ...baseExecution,
      triggeredBy: WORKFLOW_EXECUTION_FAILED_TRIGGER_ID,
    } as EsWorkflowExecution;
    const payload = buildWorkflowExecutionFailedPayload(execution, {
      stepId: 's1',
      stepName: 'Step',
      stepExecutionId: 'se1',
    });

    expect(payload.workflow.isErrorHandler).toBe(true);
  });

  it('builds payload without failedStepContext', () => {
    const payload = buildWorkflowExecutionFailedPayload(baseExecution);

    expect(payload.error.message).toBe('General error');
    expect(payload.error).not.toHaveProperty('stepId');
    expect(payload.error).not.toHaveProperty('stepName');
    expect(payload.error).not.toHaveProperty('stepExecutionId');
  });

  it('uses stepId as stepName when failedStepContext has no stepName', () => {
    const payload = buildWorkflowExecutionFailedPayload(baseExecution, {
      stepId: 'my_step_id',
      stepName: '',
      stepExecutionId: 'se1',
    });

    expect(payload.error.stepId).toBe('my_step_id');
    expect(payload.error.stepName).toBe('my_step_id');
  });

  it('defaults error message to Unknown error when execution.error is missing', () => {
    const execution = { ...baseExecution, error: null } as EsWorkflowExecution;
    const payload = buildWorkflowExecutionFailedPayload(execution);

    expect(payload.error.message).toBe('Unknown error');
  });

  it('uses execution.spaceId and defaults to default when undefined', () => {
    const execution = { ...baseExecution, spaceId: 'marketing' } as EsWorkflowExecution;
    const payload = buildWorkflowExecutionFailedPayload(execution);
    expect(payload.workflow.spaceId).toBe('marketing');

    const executionNoSpace = {
      ...baseExecution,
      spaceId: undefined,
    } as unknown as EsWorkflowExecution;
    const payloadNoSpace = buildWorkflowExecutionFailedPayload(executionNoSpace);
    expect(payloadNoSpace.workflow.spaceId).toBe('default');
  });

  it('uses finishedAt for failedAt when present, otherwise current time', () => {
    const payload = buildWorkflowExecutionFailedPayload(baseExecution);
    expect(payload.execution.failedAt).toBe('2024-01-01T10:05:00.000Z');

    const executionNoFinish = {
      ...baseExecution,
      finishedAt: undefined,
    } as unknown as EsWorkflowExecution;
    const payloadNoFinish = buildWorkflowExecutionFailedPayload(executionNoFinish);
    expect(payloadNoFinish.execution.failedAt).toBeDefined();
    expect(typeof payloadNoFinish.execution.failedAt).toBe('string');
  });
});
