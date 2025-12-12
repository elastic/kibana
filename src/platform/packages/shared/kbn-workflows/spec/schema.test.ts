/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowOutputStepSchema, WorkflowSchema, WorkflowSchemaForAutocomplete } from './schema';

describe('WorkflowSchemaForAutocomplete', () => {
  it('should allow empty "with" block', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        name: 'test',
        steps: [
          {
            name: 'step1',
            type: 'console',
            with: {},
          },
        ],
      }).data
    ).toEqual({
      version: '1',
      name: 'test',
      enabled: true,
      triggers: [],
      steps: [
        {
          name: 'step1',
          type: 'console',
          with: {},
        },
      ],
    });
  });

  it('should allow steps with just type', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        steps: [
          {
            type: 'console',
          },
        ],
      }).data
    ).toEqual({
      version: '1',
      enabled: true,
      triggers: [],
      steps: [
        {
          name: '',
          type: 'console',
        },
      ],
    });
  });

  it('should allow triggers with just type', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        triggers: [
          {
            type: 'manual',
          },
        ],
      }).data
    ).toEqual({
      version: '1',
      enabled: true,
      triggers: [
        {
          type: 'manual',
        },
      ],
      steps: [],
    });
  });

  it('should catch null type for steps and triggers and return empty string for name and type', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        steps: [
          {
            type: null,
          },
        ],
      }).data
    ).toEqual({
      version: '1',
      enabled: true,
      triggers: [],
      steps: [
        {
          name: '',
          type: '',
        },
      ],
    });
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        triggers: [
          {
            type: null,
          },
        ],
      }).data
    ).toEqual({
      version: '1',
      enabled: true,
      triggers: [
        {
          type: '',
        },
      ],
      steps: [],
    });
  });

  it('should catch non-array steps and triggers and return empty array for steps and triggers', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        steps: 'console',
      }).data
    ).toEqual({
      version: '1',
      enabled: true,
      steps: [],
      triggers: [],
    });
  });
});

describe('WorkflowOutputStepSchema', () => {
  it('should validate a basic workflow.output step', () => {
    const result = WorkflowOutputStepSchema.safeParse({
      name: 'emit_output',
      type: 'workflow.output',
      with: {
        result: 'success',
        count: 42,
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: 'emit_output',
        type: 'workflow.output',
        status: 'completed', // default status
        with: {
          result: 'success',
          count: 42,
        },
      });
    }
  });

  it('should apply default status of "completed"', () => {
    const result = WorkflowOutputStepSchema.safeParse({
      name: 'emit_output',
      type: 'workflow.output',
      with: { data: 'test' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('completed');
    }
  });

  it('should accept status: completed', () => {
    const result = WorkflowOutputStepSchema.safeParse({
      name: 'emit_output',
      type: 'workflow.output',
      status: 'completed',
      with: { data: 'test' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('completed');
    }
  });

  it('should accept status: cancelled', () => {
    const result = WorkflowOutputStepSchema.safeParse({
      name: 'emit_output',
      type: 'workflow.output',
      status: 'cancelled',
      with: { data: 'test' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('cancelled');
    }
  });

  it('should accept status: failed', () => {
    const result = WorkflowOutputStepSchema.safeParse({
      name: 'emit_output',
      type: 'workflow.output',
      status: 'failed',
      with: { error: 'Something went wrong' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('failed');
    }
  });

  it('should reject invalid status values', () => {
    const result = WorkflowOutputStepSchema.safeParse({
      name: 'emit_output',
      type: 'workflow.output',
      status: 'pending', // invalid
      with: { data: 'test' },
    });

    expect(result.success).toBe(false);
  });

  it('should accept complex output values', () => {
    const result = WorkflowOutputStepSchema.safeParse({
      name: 'emit_output',
      type: 'workflow.output',
      with: {
        stringField: 'test',
        numberField: 123,
        booleanField: true,
        arrayField: [1, 2, 3],
        objectField: { nested: 'value' },
        expressionField: '{{ steps.previous.output }}',
      },
    });

    expect(result.success).toBe(true);
  });

  it('should support if conditions', () => {
    const result = WorkflowOutputStepSchema.safeParse({
      name: 'conditional_output',
      type: 'workflow.output',
      if: '{{ steps.check.output.shouldEmit }}',
      with: { result: 'success' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.if).toBe('{{ steps.check.output.shouldEmit }}');
    }
  });

  it('should require name field', () => {
    const result = WorkflowOutputStepSchema.safeParse({
      type: 'workflow.output',
      with: { data: 'test' },
    });

    expect(result.success).toBe(false);
  });

  it('should require with field', () => {
    const result = WorkflowOutputStepSchema.safeParse({
      name: 'emit_output',
      type: 'workflow.output',
    });

    expect(result.success).toBe(false);
  });
});

describe('WorkflowSchema with workflow.output', () => {
  it('should accept a workflow with workflow.output step', () => {
    const result = WorkflowSchema.safeParse({
      name: 'test-workflow',
      triggers: [{ type: 'manual' }],
      outputs: [
        { name: 'result', type: 'string', required: true },
        { name: 'count', type: 'number', required: true },
      ],
      steps: [
        {
          name: 'process',
          type: 'http',
          with: { url: 'https://api.example.com' },
        },
        {
          name: 'emit_result',
          type: 'workflow.output',
          status: 'completed',
          with: {
            result: '{{ steps.process.output.data }}',
            count: 42,
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('should accept workflow.output as the only step', () => {
    const result = WorkflowSchema.safeParse({
      name: 'test-workflow',
      triggers: [{ type: 'manual' }],
      outputs: [{ name: 'message', type: 'string' }],
      steps: [
        {
          name: 'emit_immediately',
          type: 'workflow.output',
          with: { message: 'Hello, World!' },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('should accept workflow with outputs but no workflow.output step', () => {
    const result = WorkflowSchema.safeParse({
      name: 'test-workflow',
      triggers: [{ type: 'manual' }],
      outputs: [{ name: 'result', type: 'string' }],
      steps: [
        {
          name: 'process',
          type: 'http',
          with: { url: 'https://api.example.com' },
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
