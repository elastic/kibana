/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DynamicStepContextSchema } from '@kbn/workflows';
import { expectZodSchemaEqual } from '@kbn/workflows/common/utils/zod/test_utils/expect_zod_schema_equal';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { z } from '@kbn/zod/v4';
import { getStepsCollectionSchema } from './get_steps_collection_schema';

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
      DynamicStepContextSchema,
      workflowGraph,
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
      DynamicStepContextSchema,
      workflowGraph,
      'step-1-foreach-1'
    );
    // The actual schema for the foreach loop step
    const actualLoopSchema = (stepsCollectionSchema as z.ZodObject<any>).shape.loop;

    // Check that it's based on ForEachContextSchema
    expect(actualLoopSchema).toBeDefined();
    expect(actualLoopSchema.def.type).toBe('object');

    // Check the shape properties
    const loopShape = (actualLoopSchema as z.ZodObject<any>).shape;
    expect(loopShape.items.def.type).toBe('array');
    expect(loopShape.items.element.def.type).toBe('string');
    expect(loopShape.index.def.type).toBe('number');
    expect(loopShape.total.def.type).toBe('number');

    // For the main schema, check the step-1 output
    const step1Schema = (stepsCollectionSchema as z.ZodObject<any>).shape['step-1'];
    expect(step1Schema).toBeDefined();
    expect(step1Schema.shape.output.def.type).toBe('optional');
    expect(step1Schema.shape.error.def.type).toBe('optional');
  });

  it('should use step names as is', () => {
    const definition = {
      version: '1' as const,
      name: 'Weird Step Names',
      enabled: true,
      triggers: [
        {
          type: 'manual' as const,
          enabled: true,
        },
      ],
      steps: [
        {
          name: 'Step with spaces',
          type: 'console',
          with: {
            message: 'Hello, world!',
          },
        },
        {
          name: 'CamelCaseStep',
          type: 'console',
          with: {
            message: 'Hello, world!',
          },
        },
        {
          name: '$pecial*$ymb0l$',
          type: 'console',
          with: {
            message: 'Hello, world!',
          },
        },
        {
          name: 'point-of-access',
          type: 'console',
          with: {
            message: 'Hello, world!',
          },
        },
      ],
    };
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(definition);
    const stepsCollectionSchema = getStepsCollectionSchema(
      DynamicStepContextSchema,
      workflowGraph,
      'point-of-access'
    );

    expect(stepsCollectionSchema).toBeDefined();
    expect((stepsCollectionSchema.shape as any)['Step with spaces']).toBeDefined();
    expect((stepsCollectionSchema.shape as any).CamelCaseStep).toBeDefined();
    expect((stepsCollectionSchema.shape as any)['$pecial*$ymb0l$']).toBeDefined();

    expect(() =>
      getStepsCollectionSchema(DynamicStepContextSchema, workflowGraph, 'Step with spaces')
    ).not.toThrow();
    expect(() =>
      getStepsCollectionSchema(DynamicStepContextSchema, workflowGraph, 'CamelCaseStep')
    ).not.toThrow();
    expect(() =>
      getStepsCollectionSchema(DynamicStepContextSchema, workflowGraph, '$pecial*$ymb0l$')
    ).not.toThrow();
  });
});
