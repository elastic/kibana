/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { parseAgentContext } from '@kbn/workflows-hitl-common';
import { buildWorkflowSourceId, parseWorkflowSourceId, toInboxAction } from './to_inbox_action';

const buildStep = (overrides: Partial<EsWorkflowStepExecution> = {}): EsWorkflowStepExecution => ({
  spaceId: 'default',
  id: 'step-exec-1',
  stepId: 'wait_approval',
  stepType: 'waitForInput',
  scopeStack: [],
  workflowRunId: 'run-1',
  workflowId: 'wf-1',
  status: ExecutionStatus.WAITING_FOR_INPUT,
  startedAt: '2026-04-24T12:00:00.000Z',
  topologicalIndex: 0,
  globalExecutionIndex: 0,
  stepExecutionIndex: 0,
  input: {
    message: 'Approve isolation of host-42?',
    schema: {
      type: 'object',
      properties: { approved: { type: 'boolean' } },
      required: ['approved'],
    },
  },
  ...overrides,
});

describe('buildWorkflowSourceId / parseWorkflowSourceId', () => {
  it('round-trips a composite source id', () => {
    const step = buildStep();
    const id = buildWorkflowSourceId(step);
    expect(id).toBe('wf-1:run-1:step-exec-1');
    expect(parseWorkflowSourceId(id)).toEqual({
      workflowId: 'wf-1',
      executionId: 'run-1',
      stepExecutionId: 'step-exec-1',
    });
  });

  it('returns null for malformed ids', () => {
    expect(parseWorkflowSourceId('nope')).toBeNull();
    expect(parseWorkflowSourceId('a:b')).toBeNull();
  });

  it('re-joins trailing colons in the step execution id', () => {
    expect(parseWorkflowSourceId('wf:run:step:with:colons')).toEqual({
      workflowId: 'wf',
      executionId: 'run',
      stepExecutionId: 'step:with:colons',
    });
  });
});

describe('toInboxAction', () => {
  it('populates the core InboxAction fields from a paused waitForInput step', () => {
    const action = toInboxAction(buildStep());

    expect(action).toMatchObject({
      id: 'wf-1:run-1:step-exec-1',
      source_app: 'workflows',
      source_id: 'wf-1:run-1:step-exec-1',
      status: 'pending',
      title: 'Approve isolation of host-42?',
      input_message: 'Approve isolation of host-42?',
      input_schema: {
        type: 'object',
        properties: { approved: { type: 'boolean' } },
        required: ['approved'],
      },
      created_at: '2026-04-24T12:00:00.000Z',
      response_mode: 'pending',
    });
  });

  it('falls back to a generated title when the step has no rendered message', () => {
    const action = toInboxAction(
      buildStep({ input: { schema: { type: 'object', properties: {} } } })
    );
    expect(action.title).toBe('Step "wait_approval" is waiting for input');
    expect(action.input_message).toBeUndefined();
  });

  it('leaves input_schema undefined when the step input omits a schema', () => {
    const action = toInboxAction(buildStep({ input: { message: 'Confirm?' } }));
    expect(action.input_schema).toBeUndefined();
    expect(action.input_message).toBe('Confirm?');
  });

  it('leaves input_schema undefined when the step input is missing entirely', () => {
    const action = toInboxAction(buildStep({ input: undefined }));
    expect(action.input_schema).toBeUndefined();
    expect(action.input_message).toBeUndefined();
  });

  it('rejects array-valued schema payloads (defensive)', () => {
    const action = toInboxAction(
      buildStep({
        input: { message: 'Weird', schema: ['not', 'an', 'object'] },
      })
    );
    expect(action.input_schema).toBeUndefined();
  });

  it('appends Why clause to description when agent_context is present', () => {
    const action = toInboxAction(
      buildStep({
        input: {
          message: 'Confirm?',
          agent_context: {
            intended_tool: 'my.hitl.tool',
            intended_tool_args: { key: 'val' },
            reasoning: 'I need human approval before proceeding',
          },
        },
      })
    );

    expect(action.description).toContain('Why: I need human approval before proceeding');
    expect(action.description).toContain('via my.hitl.tool');
  });

  it('leaves description unchanged when agent_context is absent', () => {
    const action = toInboxAction(buildStep({ input: { message: 'Confirm?' } }));

    expect(action.description).not.toContain('Why:');
  });

  it('preserves intended_tool_args through parseAgentContext (regression: inline cast silently dropped it)', () => {
    const agentContextInput = {
      intended_tool: 'endpoint.isolate',
      intended_tool_args: { endpoint_id: 'abc-123', isolate: true },
      reasoning: 'Suspicious activity on the endpoint',
    };

    // parseAgentContext is now used inside toInboxAction; verify the helper
    // preserves intended_tool_args rather than silently dropping it as the
    // previous inline cast `as { reasoning: string; intended_tool: string }` did.
    const parsed = parseAgentContext(agentContextInput);

    expect(parsed?.intended_tool_args).toEqual({ endpoint_id: 'abc-123', isolate: true });
  });
});
