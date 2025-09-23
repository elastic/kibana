/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowGraph } from '@kbn/workflows/graph';
import { getStepsCollectionSchema } from './get_steps_collection_schema';
import { ForEachContextSchema, StepContextSchema } from '@kbn/workflows';
import { expectZodSchemaEqual } from '../../../../common/lib/zod_utils';
import { z } from '@kbn/zod';

describe('getStepsCollectionSchema', () => {
  it('should return empty steps collection schema for a step with no predecessors', () => {
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
          name: 'step-name',
          type: 'console',
          with: {
            message: 'Hello, world!',
          },
        },
      ],
    };
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(definition);
    const stepsCollectionSchema = getStepsCollectionSchema(
      StepContextSchema,
      workflowGraph,
      definition,
      'step-name'
    );
    expectZodSchemaEqual(stepsCollectionSchema, z.object({}));
  });
  it('should return steps collection with all predecessors outputs and foreach states for foreach steps', () => {
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
          name: 'step-1',
          type: 'console',
          with: {
            message: 'Hello, world!',
          },
        },
        {
          name: 'loop',
          type: 'foreach',
          foreach: '["item1", "item2", "item3"]',
          steps: [
            {
              name: 'step-1-foreach-1',
              type: 'console',
              with: {
                message: 'Hello, {{foreach.item}}',
              },
            },
          ],
        },
      ],
    };
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(definition);
    const stepsCollectionSchema = getStepsCollectionSchema(
      StepContextSchema,
      workflowGraph,
      definition,
      'step-1-foreach-1'
    );
    expectZodSchemaEqual(
      stepsCollectionSchema,
      z.object({
        'step-1': z.object({
          output: z.string().optional(),
          error: z.any().optional(),
        }),
        loop: ForEachContextSchema,
      })
    );
  });
});
