/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowContextSchema } from '@kbn/workflows';
import { z } from '@kbn/zod';
import { getWorkflowContextSchema } from './get_workflow_context_schema';
import {
  expectZodSchemaEqual,
  getSchemaAtPath,
  getZodTypeName,
} from '../../../../common/lib/zod/zod_utils';

describe('getWorkflowContextSchema', () => {
  it('should return the workflow context schema with empty inputs and consts', () => {
    const schema = getWorkflowContextSchema({
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [],
      steps: [],
      inputs: [],
      consts: {},
    });
    expectZodSchemaEqual(
      schema,
      WorkflowContextSchema.extend({
        inputs: z.object({}),
        consts: z.object({}),
      })
    );
  });
  it('should properly infer inputs types', () => {
    const schema = getWorkflowContextSchema({
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [],
      steps: [],
      inputs: [
        { name: 'test', type: 'string' },
        { name: 'test2', type: 'number' },
        { name: 'test3', type: 'boolean' },
        { name: 'test4', type: 'choice', options: ['option1', 'option2'] },
        { name: 'test5', type: 'array', minItems: 1 },
        { name: 'test6', type: 'array' },
        { name: 'test7', type: 'array', maxItems: 2 },
      ],
      consts: {},
    });
    expectZodSchemaEqual(
      schema,
      WorkflowContextSchema.extend({
        inputs: z.object({
          test: z.string(),
          test2: z.number(),
          test3: z.boolean(),
          test4: z.enum(['option1', 'option2']),
          test5: z.union([
            z.array(z.string()).min(1),
            z.array(z.number()).min(1),
            z.array(z.boolean()).min(1),
          ]),
          test6: z.union([z.array(z.string()), z.array(z.number()), z.array(z.boolean())]),
          test7: z.union([
            z.array(z.string()).max(2),
            z.array(z.number()).max(2),
            z.array(z.boolean()).max(2),
          ]),
        }),
        consts: z.object({}),
      })
    );
  });
  it('should properly infer consts types', () => {
    const schema = getWorkflowContextSchema({
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [],
      steps: [],
      inputs: [],
      consts: {
        test: 'test',
        test2: 1,
        test3: true,
        test4: ['option1', 'option2'],
        test5: {
          test6: 'test',
        },
      },
    });
    expectZodSchemaEqual(
      schema,
      WorkflowContextSchema.extend({
        inputs: z.object({}),
        consts: z.object({
          test: z.literal('test'),
          test2: z.literal(1),
          test3: z.literal(true),
          test4: z.array(z.literal('option1')).length(2),
          test5: z.object({
            test6: z.literal('test'),
          }),
        }),
      })
    );
  });

  it('should properly handle object type inputs with inline schema', () => {
    const schema = getWorkflowContextSchema({
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [],
      steps: [],
      inputs: [
        {
          name: 'fields',
          type: 'object',
          schema: {
            email: 'string',
            name: 'string',
            metadata: {
              source: 'string',
              routing: {
                shard: 'number',
              },
            },
          },
        },
        {
          name: 'rawDocument',
          type: 'object',
          // No schema - should accept any object
        },
      ],
      consts: {},
    });

    // Test object with schema
    const fieldsSchema = schema.shape.inputs.shape.fields;
    expect(fieldsSchema.parse({ email: 'test@example.com', name: 'Test' })).toEqual({
      email: 'test@example.com',
      name: 'Test',
    });

    // Test nested path access
    const nestedResult = getSchemaAtPath(schema.shape.inputs, 'fields.metadata.routing.shard');
    expect(nestedResult.schema).not.toBeNull();
    expect(getZodTypeName(nestedResult.schema!)).toBe('number');

    // Test object without schema (should be record)
    const rawSchema = schema.shape.inputs.shape.rawDocument;
    expect(rawSchema.parse({ any: 'property' })).toEqual({ any: 'property' });
  });
});
