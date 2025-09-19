/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getContextSchemaForPath } from './get_context_for_path';
import { z } from '@kbn/zod';
import { expectZodSchemaEqual } from '../../../../common/lib/zod_utils';
import { EventSchema } from '../../../../common/schema';
import { WorkflowExecutionContextSchema, WorkflowDataContextSchema } from '@kbn/workflows';

describe('getContextSchemaForPath', () => {
  const definition = {
    version: '1' as const,
    name: 'test-workflow',
    enabled: true,
    triggers: [
      {
        type: 'manual' as const,
        enabled: true,
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

  const workflowGraph = getWorkflowGraph(definition);

  it('should return the root context for the first step', () => {
    const context = getContextSchemaForPath(definition, workflowGraph, ['steps', 0]);

    expect(Object.keys(context.shape).sort()).toEqual(
      ['execution', 'workflow', 'now', 'event', 'inputs', 'steps', 'consts'].sort()
    );
    expectZodSchemaEqual(
      context,
      z.object({
        execution: WorkflowExecutionContextSchema,
        workflow: WorkflowDataContextSchema,
        now: z.date(),
        event: EventSchema,
        inputs: z.object({}),
        steps: z.object({}),
        consts: z.object({
          test: z.string(),
        }),
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
      z.object({
        execution: WorkflowExecutionContextSchema,
        workflow: WorkflowDataContextSchema,
        now: z.date(),
        event: EventSchema,
        inputs: z.object({}),
        steps: z.object({
          'first-step': z.object({
            output: z.string(),
          }),
        }),
        consts: z.object({
          test: z.string(),
        }),
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
