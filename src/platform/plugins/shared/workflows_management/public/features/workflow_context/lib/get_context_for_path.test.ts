/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Step, WorkflowYaml } from '@kbn/workflows';
import { DynamicStepContextSchema, ForEachContextSchema, WhileContextSchema } from '@kbn/workflows';
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

  it('should return while context for inner step of while loop', () => {
    const definitionWithWhile = {
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [{ type: 'manual' as const }],
      consts: {},
      steps: [
        {
          name: 'poll_loop',
          type: 'while',
          condition: 'steps.poll_loop.check_status.output: "ready"',
          steps: [
            {
              name: 'check_status',
              type: 'console',
            },
          ],
        },
      ],
    } as WorkflowYaml;
    const workflowGraphWithWhile = WorkflowGraph.fromWorkflowDefinition(definitionWithWhile);
    const context = getContextSchemaForPath(definitionWithWhile, workflowGraphWithWhile, [
      'steps',
      0,
      'steps',
      0,
    ]);
    expect((context.shape as any).while).toBeDefined();
    expectZodSchemaEqual((context.shape as any).while, WhileContextSchema);
  });

  it('should return while context for the condition field of a while step', () => {
    const definitionWithWhile = {
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [{ type: 'manual' as const }],
      consts: {},
      steps: [
        {
          name: 'poll_loop',
          type: 'while',
          condition: 'while.iteration < 10',
          steps: [
            {
              name: 'check_status',
              type: 'console',
            },
          ],
        },
      ],
    } as WorkflowYaml;
    const workflowGraphWithWhile = WorkflowGraph.fromWorkflowDefinition(definitionWithWhile);
    const context = getContextSchemaForPath(definitionWithWhile, workflowGraphWithWhile, [
      'steps',
      0,
      'condition',
    ]);
    expect((context.shape as any).while).toBeDefined();
    expectZodSchemaEqual((context.shape as any).while, WhileContextSchema);
  });

  it('should return item and index context for data.map step with.fields', () => {
    const definitionWithDataMap = {
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [{ type: 'manual' as const }],
      steps: [
        {
          name: 'map-step',
          type: 'data.map',
          items: '${{ consts.items }}',
          with: {
            fields: {
              title: '${{ item.title }}',
              pos: '${{ index }}',
            },
          },
        },
      ],
      consts: { items: [{ title: 'hello' }] },
    } as unknown as WorkflowYaml;

    const graph = WorkflowGraph.fromWorkflowDefinition(definitionWithDataMap);
    const context = getContextSchemaForPath(definitionWithDataMap, graph, [
      'steps',
      0,
      'with',
      'fields',
      'title',
    ]);

    expect((context.shape as any).item).toBeDefined();
    expect((context.shape as any).index).toBeDefined();
  });

  it('should add item/index context for data.map step outside with block', () => {
    const definitionWithDataMap = {
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [{ type: 'manual' as const }],
      steps: [
        {
          name: 'map-step',
          type: 'data.map',
          items: '${{ consts.items }}',
          with: {
            fields: {
              title: '${{ item.title }}',
            },
          },
        },
      ],
      consts: { items: [{ title: 'hello' }] },
    } as unknown as WorkflowYaml;

    const graph = WorkflowGraph.fromWorkflowDefinition(definitionWithDataMap);
    const context = getContextSchemaForPath(definitionWithDataMap, graph, ['steps', 0, 'items']);

    expect((context.shape as any).item).toBeDefined();
    expect((context.shape as any).index).toBeDefined();
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

  it('should return context for switch step expression field', () => {
    const definitionWithSwitch = {
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [{ type: 'manual' as const }],
      inputs: {
        provider: { type: 'string' as const },
      },
      consts: {},
      steps: [
        {
          name: 'check',
          type: 'console',
          with: { message: 'Check status' },
        },
        {
          name: 'switch-step',
          type: 'switch' as const,
          expression: '{{ inputs.provider }}',
          cases: [
            {
              match: 'aws',
              steps: [{ name: 'aws-step', type: 'console', with: { message: 'AWS' } }],
            },
          ],
        },
      ],
    } as unknown as WorkflowYaml;
    const workflowGraphWithSwitch = WorkflowGraph.fromWorkflowDefinition(definitionWithSwitch);
    const context = getContextSchemaForPath(definitionWithSwitch, workflowGraphWithSwitch, [
      'steps',
      1,
      'expression',
    ]);

    expect((context.shape as any).inputs).toBeDefined();
    expect((context.shape as any).steps).toBeDefined();
    expect(Object.keys((context.shape as any).steps.shape).sort()).toEqual(['check'].sort());
  });

  it('should return context for step inside switch case', () => {
    const definitionWithSwitch = {
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [{ type: 'manual' as const }],
      consts: {},
      steps: [
        {
          name: 'before-switch',
          type: 'console',
          with: { message: 'Before' },
        },
        {
          name: 'switch-step',
          type: 'switch' as const,
          expression: '{{ steps.before_switch.output }}',
          cases: [
            {
              match: 'ok',
              steps: [
                {
                  name: 'case-step',
                  type: 'console',
                  with: { message: 'In case' },
                },
              ],
            },
          ],
        },
      ],
    } as unknown as WorkflowYaml;
    const workflowGraphWithSwitch = WorkflowGraph.fromWorkflowDefinition(definitionWithSwitch);
    const context = getContextSchemaForPath(definitionWithSwitch, workflowGraphWithSwitch, [
      'steps',
      1,
      'cases',
      0,
      'steps',
      0,
      'with',
      'message',
    ]);

    expect((context.shape as any).steps).toBeDefined();
    expect(Object.keys((context.shape as any).steps.shape).sort()).toEqual(
      ['before-switch', 'switch-step'].sort()
    );
  });

  it('should return context for switch step as first step', () => {
    const definitionWithSwitchFirst = {
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [{ type: 'manual' as const }],
      inputs: {
        provider: { type: 'string' as const },
      },
      consts: {},
      steps: [
        {
          name: 'switch-step',
          type: 'switch' as const,
          expression: '{{ inputs.provider }}',
          cases: [
            {
              match: 'a',
              steps: [{ name: 'case-a', type: 'console', with: { message: 'A' } }],
            },
          ],
        },
      ],
    } as unknown as WorkflowYaml;
    const workflowGraphWithSwitch = WorkflowGraph.fromWorkflowDefinition(definitionWithSwitchFirst);
    const context = getContextSchemaForPath(definitionWithSwitchFirst, workflowGraphWithSwitch, [
      'steps',
      0,
      'expression',
    ]);

    expect((context.shape as any).inputs).toBeDefined();
    expect((context.shape as any).steps).toBeDefined();
    expect((context.shape as any).consts).toBeDefined();
    expect((context.shape as any).variables).toBeDefined();
    expect(Object.keys((context.shape as any).steps.shape)).toEqual([]);
  });
});
