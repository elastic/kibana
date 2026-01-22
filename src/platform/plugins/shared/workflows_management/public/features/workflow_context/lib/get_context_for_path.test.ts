/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Step, WorkflowYaml } from '@kbn/workflows';
import { DynamicStepContextSchema, ForEachContextSchema } from '@kbn/workflows';
import { expectZodSchemaEqual } from '@kbn/workflows/common/utils/zod/test_utils/expect_zod_schema_equal';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { z } from '@kbn/zod/v4';
import { getContextSchemaForPath } from './get_context_for_path';

jest.mock('./get_output_schema_for_step_type');

describe('getContextSchemaForPath', () => {
  const definition = {
    version: '1' as const,
    name: 'test-workflow',
    enabled: true,
    triggers: [
      {
        type: 'manual' as const,
      },
    ],
    steps: [
      {
        name: 'first-step',
        type: 'console',
        with: {
          message: 'Hello, world!',
        },
      },
      {
        name: 'second-step',
        type: 'console',
        with: {
          message: 'Again, hello, world!',
        },
      },
      {
        name: 'if-split',
        type: 'if',
        condition: '1 > 0',
        steps: [
          {
            name: 'if-true-1',
            type: 'console',
            with: {
              message: 'If true',
            },
          },
          {
            name: 'if-true-2',
            type: 'console',
            with: {
              message: 'If true 2',
            },
          },
        ],
        else: [
          {
            name: 'if-false',
            type: 'console',
            with: {
              message: 'If false',
            },
          },
        ],
      },
    ],
    consts: {
      test: 'test',
    },
  } as WorkflowYaml;

  const workflowGraph = WorkflowGraph.fromWorkflowDefinition(definition);

  it('should return the root context for the first step', () => {
    const context = getContextSchemaForPath(definition, workflowGraph, ['steps', 0]);

    expectZodSchemaEqual(
      context,
      DynamicStepContextSchema.extend({
        inputs: z.object({}),
        consts: z.object({
          test: z.literal('test'),
        }),
        variables: z.object({}).optional(),
      })
    );
  });

  it('should return the context for the second step', () => {
    const context = getContextSchemaForPath(definition, workflowGraph, [
      'steps',
      1,
      'with',
      'message',
    ]);

    expectZodSchemaEqual(
      context,
      DynamicStepContextSchema.extend({
        inputs: z.object({}),
        steps: z.object({
          'first-step': z.object({
            output: z.string().optional(),
            error: z.any().optional(),
          }),
        }),
        consts: z.object({
          test: z.literal('test'),
        }),
        variables: z.object({}).optional(),
      })
    );
  });

  it('should return foreach context for nested foreach step', () => {
    const definitionWithForeach = {
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [
        {
          type: 'manual' as const,
        },
      ],
      consts: {
        items: [
          {
            name: 'Robert',
            surname: 'Carmack',
          },
          {
            name: 'Jane',
            surname: 'Doe',
          },
        ],
      },
      steps: [
        {
          name: 'foreach-step',
          type: 'foreach',
          foreach: '{{consts.items}}',
          steps: [
            {
              name: 'foreach-step-1',
              type: 'console',
              with: {
                message: 'Hello, {{foreach.item.name}} {{foreach.item.surname}}',
              },
            } as Step,
          ],
        },
      ],
    } as WorkflowYaml;
    const workflowGraphWithForeach = WorkflowGraph.fromWorkflowDefinition(definitionWithForeach);
    const context = getContextSchemaForPath(definitionWithForeach, workflowGraphWithForeach, [
      'steps',
      0,
      'steps',
      0,
      'with',
      'message',
    ]);
    const itemSchema = z.object({
      name: z.literal('Robert'),
      surname: z.literal('Carmack'),
    });
    expect((context.shape as any).foreach).toBeDefined();
    expectZodSchemaEqual(
      (context.shape as any).foreach,
      ForEachContextSchema.extend({
        items: z.array(itemSchema),
        item: itemSchema,
      })
    );
  });

  it('should return the context for second step in true branch of if-split', () => {
    const context = getContextSchemaForPath(definition, workflowGraph, [
      'steps',
      2,
      'steps',
      1,
      'with',
      'message',
    ]);

    expect(Object.keys((context.shape as any).steps.shape).sort()).toEqual(
      ['first-step', 'second-step', 'if-split', 'if-true-1'].sort()
    );
  });

  it('should return the context for first step in false branch of if-split', () => {
    const context = getContextSchemaForPath(definition, workflowGraph, [
      'steps',
      2,
      'else',
      0,
      'with',
      'message',
    ]);

    expect(Object.keys((context.shape as any).steps.shape).sort()).toEqual(
      ['first-step', 'second-step', 'if-split'].sort()
    );
  });
});
