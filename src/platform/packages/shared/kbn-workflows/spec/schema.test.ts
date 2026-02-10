/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CollisionStrategy, ConcurrencySettings } from './schema';
import {
  CollisionStrategySchema,
  ConcurrencySettingsSchema,
  WorkflowSchema,
  WorkflowSchemaForAutocomplete,
  WorkflowSettingsSchema,
} from './schema';
import { JsonModelSchema } from './schema/common/json_model_schema';

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

describe('ConcurrencySettingsSchema', () => {
  describe('key', () => {
    it('should accept valid key string', () => {
      const result = ConcurrencySettingsSchema.safeParse({
        key: 'server-1',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBe('server-1');
      }
    });

    it('should accept template expression key', () => {
      const result = ConcurrencySettingsSchema.safeParse({
        key: '{{ event.host.name }}',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBe('{{ event.host.name }}');
      }
    });

    it('should accept empty key', () => {
      const result = ConcurrencySettingsSchema.safeParse({
        key: '',
      });
      expect(result.success).toBe(true);
    });

    it('should allow key to be optional', () => {
      const result = ConcurrencySettingsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBeUndefined();
      }
    });
  });

  describe('strategy', () => {
    it('should accept valid strategy values', () => {
      const strategies = ['cancel-in-progress', 'drop'] as const;
      strategies.forEach((strategy) => {
        const result = ConcurrencySettingsSchema.safeParse({
          strategy,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.strategy).toBe(strategy);
        }
      });
    });

    it('should reject invalid strategy values', () => {
      const result = ConcurrencySettingsSchema.safeParse({
        strategy: 'invalid-strategy',
      });
      expect(result.success).toBe(false);
    });

    it('should allow strategy to be omitted', () => {
      const result = ConcurrencySettingsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.strategy).toBeUndefined();
      }
    });
  });

  describe('max', () => {
    it('should accept valid positive integer values', () => {
      const result = ConcurrencySettingsSchema.safeParse({
        max: 5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.max).toBe(5);
      }
    });

    it('should accept minimum value of 1', () => {
      const result = ConcurrencySettingsSchema.safeParse({
        max: 1,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.max).toBe(1);
      }
    });

    it('should reject values less than 1', () => {
      const result = ConcurrencySettingsSchema.safeParse({
        max: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative values', () => {
      const result = ConcurrencySettingsSchema.safeParse({
        max: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer values', () => {
      const result = ConcurrencySettingsSchema.safeParse({
        max: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('should allow max to be omitted', () => {
      const result = ConcurrencySettingsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.max).toBeUndefined();
      }
    });
  });

  it('should export ConcurrencySettings type that matches schema inference', () => {
    // Verify the type can be used and matches the schema inference
    const testSettings: ConcurrencySettings = {
      key: '{{ event.host.name }}',
      strategy: 'drop',
      max: 3,
    };
    const result = ConcurrencySettingsSchema.safeParse(testSettings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.key).toBe(testSettings.key);
      expect(result.data.strategy).toBe(testSettings.strategy);
      expect(result.data.max).toBe(testSettings.max);
    }
  });
});

describe('WorkflowSettingsSchema', () => {
  describe('concurrency', () => {
    it('should accept valid concurrency settings', () => {
      const result = WorkflowSettingsSchema.safeParse({
        concurrency: {
          key: '{{ event.host.name }}',
          strategy: 'cancel-in-progress',
          max: 3,
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.concurrency?.key).toBe('{{ event.host.name }}');
        expect(result.data.concurrency?.strategy).toBe('cancel-in-progress');
        expect(result.data.concurrency?.max).toBe(3);
      }
    });

    it('should accept partial concurrency settings', () => {
      const result = WorkflowSettingsSchema.safeParse({
        concurrency: {
          key: 'server-1',
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.concurrency?.key).toBe('server-1');
        expect(result.data.concurrency?.strategy).toBeUndefined();
        expect(result.data.concurrency?.max).toBeUndefined();
      }
    });

    it('should allow concurrency to be omitted', () => {
      const result = WorkflowSettingsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.concurrency).toBeUndefined();
      }
    });

    it('should validate nested concurrency fields', () => {
      const result = WorkflowSettingsSchema.safeParse({
        concurrency: {
          strategy: 'invalid-strategy',
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CollisionStrategySchema', () => {
    it('should accept all valid strategy values', () => {
      expect(CollisionStrategySchema.safeParse('cancel-in-progress').success).toBe(true);
      expect(CollisionStrategySchema.safeParse('drop').success).toBe(true);
      expect(CollisionStrategySchema.safeParse('queue').success).toBe(false);
    });

    it('should reject invalid strategy values', () => {
      expect(CollisionStrategySchema.safeParse('invalid').success).toBe(false);
      expect(CollisionStrategySchema.safeParse('').success).toBe(false);
      expect(CollisionStrategySchema.safeParse(null).success).toBe(false);
    });

    it('should export CollisionStrategy type that matches valid values', () => {
      // Verify the type can be used and matches the schema values
      const validStrategies: CollisionStrategy[] = ['cancel-in-progress', 'drop'];
      validStrategies.forEach((strategy) => {
        const result = CollisionStrategySchema.safeParse(strategy);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(strategy);
        }
      });
    });
  });
});

describe('JsonModelSchema', () => {
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
    const result = JsonModelSchema.safeParse(inputs);
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
    const result = JsonModelSchema.safeParse(inputs);
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
    const result = JsonModelSchema.safeParse(inputs);
    expect(result.success).toBe(false);
  });

  it('should reject if required field does not exist in properties', () => {
    const inputs = {
      properties: {
        username: { type: 'string' },
      },
      required: ['username', 'nonexistent'],
    };
    const result = JsonModelSchema.safeParse(inputs);
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
      // Type guard: inputs can be either JSON Schema format (object with properties) or legacy array format
      const inputs = result.data.inputs;
      if (
        inputs &&
        typeof inputs === 'object' &&
        !Array.isArray(inputs) &&
        'properties' in inputs
      ) {
        expect(inputs.properties?.fields).toBeDefined();
      }
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
