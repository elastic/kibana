/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  MAX_WORKFLOW_EXECUTION_CONTEXT_VALUE_LENGTH,
  RunWorkflowCommandSchema,
  RunWorkflowResponseSchema,
  WorkflowExecutionContextSchema,
} from './v1';

describe('workflow execution context schemas', () => {
  it('parses a workflow execution context reference', () => {
    expect(
      WorkflowExecutionContextSchema.parse({
        type: 'cases.case',
        id: 'case-123',
      })
    ).toEqual({
      type: 'cases.case',
      id: 'case-123',
    });
  });

  it('parses a workflow execution context with one parent reference', () => {
    expect(
      WorkflowExecutionContextSchema.parse({
        type: 'alerts.alert',
        id: 'alert-123',
        parent: {
          type: 'cases.case',
          id: 'case-123',
        },
      })
    ).toEqual({
      type: 'alerts.alert',
      id: 'alert-123',
      parent: {
        type: 'cases.case',
        id: 'case-123',
      },
    });
  });

  it('rejects empty or oversized workflow execution context values', () => {
    expect(
      WorkflowExecutionContextSchema.safeParse({
        type: '',
        id: 'case-123',
      }).success
    ).toBe(false);
    expect(
      WorkflowExecutionContextSchema.safeParse({
        type: 'cases.case',
        id: 'a'.repeat(MAX_WORKFLOW_EXECUTION_CONTEXT_VALUE_LENGTH + 1),
      }).success
    ).toBe(false);
    expect(
      WorkflowExecutionContextSchema.safeParse({
        type: 'alerts.alert',
        id: 'alert-123',
        parent: {
          type: 'cases.case',
          id: 'a'.repeat(MAX_WORKFLOW_EXECUTION_CONTEXT_VALUE_LENGTH + 1),
        },
      }).success
    ).toBe(false);
  });

  it('allows a workflow run command without an execution context', () => {
    expect(RunWorkflowCommandSchema.parse({ inputs: {} })).toEqual({ inputs: {} });
  });

  it('allows a workflow run command with an execution context', () => {
    expect(
      RunWorkflowCommandSchema.parse({
        inputs: {},
        executionContext: {
          type: 'alerts.alert',
          id: 'alert-123',
          parent: {
            type: 'cases.case',
            id: 'case-123',
          },
        },
      })
    ).toEqual({
      inputs: {},
      executionContext: {
        type: 'alerts.alert',
        id: 'alert-123',
        parent: {
          type: 'cases.case',
          id: 'case-123',
        },
      },
    });
  });

  it.each(['succeeded', 'failed'] as const)(
    'allows a workflow run response with a %s follow-up',
    (status) => {
      expect(
        RunWorkflowResponseSchema.parse({
          workflowExecutionId: 'execution-123',
          followUp: { status },
        })
      ).toEqual({
        workflowExecutionId: 'execution-123',
        followUp: { status },
      });
    }
  );
});
