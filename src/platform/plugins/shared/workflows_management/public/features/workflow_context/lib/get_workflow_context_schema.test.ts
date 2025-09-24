/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowContextSchema } from '@kbn/workflows';
import { getWorkflowContextSchema } from './get_workflow_context_schema';
import { expectZodSchemaEqual } from '../../../../common/lib/zod/zod_utils';
import { z } from '@kbn/zod';

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
          test: z.string(),
          test2: z.number(),
          test3: z.boolean(),
          test4: z.array(z.string()).length(2),
          test5: z.object({
            test6: z.string(),
          }),
        }),
      })
    );
  });
});
