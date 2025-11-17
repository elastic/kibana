/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowInputsJsonSchema, WorkflowSchema, WorkflowSchemaForAutocomplete } from './schema';

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

describe('WorkflowInputsJsonSchema', () => {
  it('should validate a simple JSON Schema inputs object', () => {
    const inputs = {
      properties: {
        username: {
          type: 'string',
          description: "User's username",
        },
        age: {
          type: 'number',
          description: "User's age",
          default: 18,
        },
      },
      required: ['username'],
      additionalProperties: false,
    };
    const result = WorkflowInputsJsonSchema.safeParse(inputs);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.properties?.username).toEqual({
        type: 'string',
        description: "User's username",
      });
      expect(result.data.required).toEqual(['username']);
    }
  });

  it('should validate a nested JSON Schema inputs object', () => {
    const inputs = {
      properties: {
        customer: {
          type: 'object',
          description: 'Customer information',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                zipCode: { type: 'string', pattern: '^\\d{5}(-\\d{4})?$' },
              },
              required: ['street', 'city'],
              additionalProperties: false,
            },
          },
          required: ['name', 'email'],
          additionalProperties: false,
        },
      },
      required: ['customer'],
      additionalProperties: false,
    };
    const result = WorkflowInputsJsonSchema.safeParse(inputs);
    expect(result.success).toBe(true);
  });

  it('should reject invalid JSON Schema in properties', () => {
    const inputs = {
      properties: {
        invalid: {
          type: 'invalid-type',
        },
      },
    };
    const result = WorkflowInputsJsonSchema.safeParse(inputs);
    expect(result.success).toBe(false);
  });

  it('should reject if required field does not exist in properties', () => {
    const inputs = {
      properties: {
        username: { type: 'string' },
      },
      required: ['username', 'nonexistent'],
    };
    const result = WorkflowInputsJsonSchema.safeParse(inputs);
    expect(result.success).toBe(false);
  });

  it('should accept new JSON Schema object format for inputs', () => {
    const workflow = {
      version: '1',
      name: 'test',
      triggers: [{ type: 'manual' }],
      steps: [{ name: 'step1', type: 'console' }],
      inputs: {
        properties: {
          username: {
            type: 'string',
            description: "User's username",
          },
          age: {
            type: 'number',
            description: "User's age",
            default: 18,
          },
        },
        required: ['username'],
        additionalProperties: false,
      },
    };
    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inputs?.properties?.username).toEqual({
        type: 'string',
        description: "User's username",
      });
      expect(result.data.inputs?.required).toEqual(['username']);
    }
  });

  it('should accept nested object example from requirements', () => {
    const workflow = {
      version: '1',
      name: 'test',
      triggers: [{ type: 'manual' }],
      steps: [{ name: 'step1', type: 'console' }],
      inputs: {
        properties: {
          customer: {
            type: 'object',
            description: 'Customer information',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              address: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                  zipCode: { type: 'string', pattern: '^\\d{5}(-\\d{4})?$' },
                },
                required: ['street', 'city'],
                additionalProperties: false,
              },
            },
            required: ['name', 'email'],
            additionalProperties: false,
          },
        },
        required: ['customer'],
        additionalProperties: false,
      },
    };
    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(true);
  });

  it('should accept JSON Schema inputs in WorkflowSchemaForAutocomplete (new format)', () => {
    const workflow = {
      name: 'New workflow',
      enabled: false,
      triggers: [{ type: 'manual' }],
      inputs: {
        properties: {
          fields: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              name: { type: 'string' },
            },
            required: ['email', 'name'],
          },
        },
        required: ['fields'],
        additionalProperties: false,
      },
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
      expect(result.data.inputs?.properties?.fields).toBeDefined();
    }
  });

  it('should accept legacy array format in WorkflowSchemaForAutocomplete (backward compatibility)', () => {
    const workflow = {
      name: 'Legacy workflow',
      triggers: [{ type: 'manual' }],
      inputs: [
        {
          name: 'username',
          type: 'string',
          required: true,
        },
      ],
      steps: [{ name: 'step1', type: 'console' }],
    };
    const result = WorkflowSchemaForAutocomplete.safeParse(workflow);
    expect(result.success).toBe(true);
  });
});
