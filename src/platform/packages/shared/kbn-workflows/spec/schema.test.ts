/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowSchemaForAutocomplete, WorkflowInputJsonSchemaSchema, WorkflowInputSchema, WorkflowSchema } from './schema';

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
      name: 'test',
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
      steps: [],
      triggers: [],
    });
  });
});

describe('WorkflowInputJsonSchemaSchema', () => {
  it('should validate a simple JSON Schema input', () => {
    const input = {
      name: 'fields',
      type: 'json-schema',
      schema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['email', 'name'],
      },
    };
    const result = WorkflowInputJsonSchemaSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('fields');
      expect(result.data.type).toBe('json-schema');
      expect(result.data.schema.type).toBe('object');
    }
  });

  it('should validate a nested JSON Schema input', () => {
    const input = {
      name: 'fields',
      type: 'json-schema',
      schema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          metadata: {
            type: 'object',
            properties: {
              source: { type: 'string' },
              routing: {
                type: 'object',
                properties: {
                  shard: { type: 'number' },
                  primary: { type: 'boolean' },
                },
              },
            },
          },
        },
        required: ['email'],
      },
      default: {
        email: 'user@example.com',
        metadata: {
          source: 'api',
          routing: {
            shard: 1,
            primary: true,
          },
        },
      },
    };
    const result = WorkflowInputJsonSchemaSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject invalid JSON Schema', () => {
    const input = {
      name: 'fields',
      type: 'json-schema',
      schema: {
        type: 'invalid-type',
      },
    };
    const result = WorkflowInputJsonSchemaSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept JSON Schema input in WorkflowSchema', () => {
    const workflow = {
      version: '1',
      name: 'test',
      triggers: [{ type: 'manual' }],
      steps: [{ name: 'step1', type: 'console' }],
      inputs: [
        {
          name: 'fields',
          type: 'json-schema',
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              name: { type: 'string' },
            },
            required: ['email', 'name'],
          },
        },
      ],
    };
    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inputs?.[0].type).toBe('json-schema');
    }
  });

  it('should accept the example from requirements', () => {
    const workflow = {
      version: '1',
      name: 'test',
      triggers: [{ type: 'manual' }],
      steps: [{ name: 'step1', type: 'console' }],
      inputs: [
        {
          name: 'fields',
          type: 'json-schema',
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              name: { type: 'string' },
              metadata: {
                type: 'object',
                properties: {
                  source: { type: 'string' },
                  routing: {
                    type: 'object',
                    properties: {
                      shard: { type: 'number' },
                      primary: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            required: ['email', 'name'],
          },
          default: {
            email: 'user@example.com',
            name: 'John Doe',
            metadata: {
              source: 'api',
              routing: {
                shard: 1,
                primary: true,
              },
            },
          },
        },
      ],
    };
    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(true);
  });

  it('should accept JSON Schema input in WorkflowSchemaForAutocomplete', () => {
    const workflow = {
      name: 'New workflow',
      enabled: false,
      triggers: [{ type: 'manual' }],
      inputs: [
        {
          name: 'fields',
          type: 'json-schema',
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              name: { type: 'string' },
              metadata: {
                type: 'object',
                properties: {
                  source: { type: 'string' },
                  routing: {
                    type: 'object',
                    properties: {
                      shard: { type: 'number' },
                      primary: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            required: ['email', 'name'],
          },
          default: {
            email: 'user@example.com',
            name: 'John Doe',
            metadata: {
              source: 'api',
              routing: {
                shard: 1,
                primary: true,
              },
            },
          },
        },
      ],
      steps: [
        {
          name: 'first-step',
          type: 'console',
          with: {
            message: '{{ inputs }}',
          },
        },
      ],
    };
    const result = WorkflowSchemaForAutocomplete.safeParse(workflow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inputs?.[0].type).toBe('json-schema');
      expect(result.data.inputs?.[0].name).toBe('fields');
    }
  });
});
