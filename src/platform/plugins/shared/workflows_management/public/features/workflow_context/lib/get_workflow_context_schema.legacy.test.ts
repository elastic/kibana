/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DynamicWorkflowContextSchema } from '@kbn/workflows';
import { getWorkflowContextSchema } from './get_workflow_context_schema';
import { getSchemaAtPath } from '../../../../common/lib/zod/zod_utils';

describe('getWorkflowContextSchema - Legacy Array Format', () => {
  it('should handle legacy array format inputs for variable validation', () => {
    // This simulates what parseWorkflowYamlForAutocomplete returns for legacy workflows
    const workflow = {
      name: 'New workflow',
      enabled: false,
      triggers: [{ type: 'manual' }],
      inputs: [
        {
          name: 'people',
          type: 'array',
          default: ['alice', 'bob', 'charlie'],
          description: 'List of people to greet',
        },
        {
          name: 'greeting',
          type: 'string',
          default: 'Hello',
          description: 'The greeting message to use',
        },
      ],
      steps: [
        {
          name: 'first-step',
          type: 'console',
          with: {
            message: 'First step executed',
          },
        },
      ],
    };

    const contextSchema: typeof DynamicWorkflowContextSchema = getWorkflowContextSchema(
      workflow as any
    );

    // Should be able to access inputs.people as an array
    const peopleSchema = getSchemaAtPath(contextSchema, 'inputs.people');
    expect(peopleSchema.schema).toBeDefined();
    // If there's a default, unwrap it to check the underlying type
    if (!peopleSchema.schema) {
      throw new Error('peopleSchema.schema is null');
    }
    const underlyingSchema =
      (peopleSchema.schema._def as { typeName?: string; innerType?: typeof peopleSchema.schema })
        .typeName === 'ZodDefault'
        ? (peopleSchema.schema._def as { innerType: typeof peopleSchema.schema }).innerType
        : peopleSchema.schema;
    expect((underlyingSchema._def as { typeName?: string }).typeName).toBe('ZodArray');

    // Should be able to access inputs.greeting as a string
    const greetingSchema = getSchemaAtPath(contextSchema, 'inputs.greeting');
    expect(greetingSchema.schema).toBeDefined();
    // If there's a default, unwrap it to check the underlying type
    if (!greetingSchema.schema) {
      throw new Error('greetingSchema.schema is null');
    }
    const underlyingGreetingSchema =
      (
        greetingSchema.schema._def as {
          typeName?: string;
          innerType?: typeof greetingSchema.schema;
        }
      ).typeName === 'ZodDefault'
        ? (greetingSchema.schema._def as { innerType: typeof greetingSchema.schema }).innerType
        : greetingSchema.schema;
    expect((underlyingGreetingSchema._def as { typeName?: string }).typeName).toBe('ZodString');
  });

  it('should handle legacy array format inputs with nested foreach validation', () => {
    const workflow = {
      name: 'Legacy workflow',
      enabled: true,
      triggers: [{ type: 'manual' }],
      inputs: [
        {
          name: 'people',
          type: 'array',
          default: ['alice', 'bob'],
        },
      ],
      steps: [
        {
          name: 'iterate_people',
          type: 'foreach',
          foreach: '{{ inputs.people }}',
          steps: [
            {
              name: 'log_person',
              type: 'console',
              with: {
                message: '{{ foreach.item }}',
              },
            },
          ],
        },
      ],
    };

    const contextSchema: typeof DynamicWorkflowContextSchema = getWorkflowContextSchema(
      workflow as any
    );

    // Should be able to access inputs.people for foreach validation
    const peopleSchema = getSchemaAtPath(contextSchema, 'inputs.people');
    expect(peopleSchema.schema).toBeDefined();
    // If there's a default, unwrap it to check the underlying type
    if (!peopleSchema.schema) {
      throw new Error('peopleSchema.schema is null');
    }
    const underlyingSchema =
      (peopleSchema.schema._def as { typeName?: string; innerType?: typeof peopleSchema.schema })
        .typeName === 'ZodDefault'
        ? (peopleSchema.schema._def as { innerType: typeof peopleSchema.schema }).innerType
        : peopleSchema.schema;
    expect((underlyingSchema._def as { typeName?: string }).typeName).toBe('ZodArray');
  });
});
