/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import { convertLegacyInputsToJsonSchema, normalizeInputsToJsonSchema } from './input_conversion';
import type { WorkflowInputSchema } from '../schema';

describe('convertLegacyInputsToJsonSchema', () => {
  it('should convert array of legacy inputs to JSON Schema object format', () => {
    const legacyInputs = [
      {
        name: 'username',
        type: 'string' as const,
        description: 'User name',
        required: true,
        default: 'john',
      },
      {
        name: 'age',
        type: 'number' as const,
        default: 25,
      },
    ];

    const result = convertLegacyInputsToJsonSchema(
      legacyInputs as Array<z.infer<typeof WorkflowInputSchema>>
    );

    expect(result).toEqual({
      properties: {
        username: {
          type: 'string',
          description: 'User name',
          default: 'john',
        },
        age: {
          type: 'number',
          default: 25,
        },
      },
      required: ['username'],
      additionalProperties: false,
    });
  });

  it('should convert choice input to enum', () => {
    const legacyInputs = [
      {
        name: 'status',
        type: 'choice' as const,
        options: ['active', 'inactive'],
        required: true,
      },
    ];

    const result = convertLegacyInputsToJsonSchema(
      legacyInputs as Array<z.infer<typeof WorkflowInputSchema>>
    );

    expect(result.properties?.status).toEqual({
      type: 'string',
      enum: ['active', 'inactive'],
    });
    expect(result.required).toEqual(['status']);
  });

  it('should convert array input with constraints', () => {
    const legacyInputs = [
      {
        name: 'tags',
        type: 'array' as const,
        minItems: 1,
        maxItems: 10,
      },
    ];

    const result = convertLegacyInputsToJsonSchema(
      legacyInputs as Array<z.infer<typeof WorkflowInputSchema>>
    );

    expect(result.properties?.tags).toEqual({
      type: 'array',
      items: {
        anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
      },
      minItems: 1,
      maxItems: 10,
    });
  });

  it('should handle empty array', () => {
    const result = convertLegacyInputsToJsonSchema([]);
    expect(result).toEqual({
      properties: {},
      additionalProperties: false,
    });
  });

  it('should not include required array if no inputs are required', () => {
    const legacyInputs = [
      {
        name: 'optional',
        type: 'string' as const,
        required: false,
      },
    ];

    const result = convertLegacyInputsToJsonSchema(
      legacyInputs as Array<z.infer<typeof WorkflowInputSchema>>
    );

    expect(result.required).toBeUndefined();
  });
});

describe('normalizeInputsToJsonSchema', () => {
  it('should return new format inputs as-is', () => {
    const inputs = {
      properties: {
        username: {
          type: 'string',
          description: 'User name',
        },
      },
      required: ['username'],
      additionalProperties: false,
    };

    const result = normalizeInputsToJsonSchema(inputs);
    expect(result).toEqual(inputs);
  });

  it('should convert legacy array format to new format', () => {
    const legacyInputs = [
      {
        name: 'username',
        type: 'string' as const,
        required: true,
      },
    ];

    const result = normalizeInputsToJsonSchema(legacyInputs as any);

    expect(result?.properties?.username).toEqual({
      type: 'string',
    });
    expect(result?.required).toEqual(['username']);
  });

  it('should return undefined for undefined input', () => {
    const result = normalizeInputsToJsonSchema(undefined);
    expect(result).toBeUndefined();
  });

  it('should handle nested object example from requirements', () => {
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

    const result = normalizeInputsToJsonSchema(inputs);
    expect(result).toEqual(inputs);
  });
});
