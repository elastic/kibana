/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DynamicStepContextSchema } from '@kbn/workflows';
import { getStepId, isForeachStep, type WorkflowYaml } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { z } from '@kbn/zod';
import { getStepByNameFromNestedSteps } from '@kbn/workflows/definition';
import { getOutputSchemaForStepType } from '../../../../common/schema';
import { getForeachStateSchema } from './get_foreach_state_schema';

export function getStepsCollectionSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  workflowExecutionGraph: WorkflowGraph,
  workflowDefinition: WorkflowYaml,
  stepName: string
) {
  // reverse predecessors so the earliest steps are first and will be available when we reach the later ones
  const predecessors = [
    ...workflowExecutionGraph.getAllPredecessors(getStepId(stepName)),
  ].reverse();

  if (predecessors.length === 0) {
    return z.object({});
  }

  let stepsSchema = z.object({});
  for (const node of predecessors) {
    // Excluding triggers from the context for now. Maybe they should be included under 'triggers' key?
    if (node.type === 'trigger') {
      continue;
    }

    if (node.stepType !== 'foreach') {
      stepsSchema = stepsSchema.extend({
        [node.stepId]: z.object({
          output: getOutputSchemaForStepType(node.stepType).optional(),
          error: z.any().optional(),
        }),
      });
    } else {
      const foreachStep = getStepByNameFromNestedSteps(workflowDefinition.steps, node.stepId);
      if (!foreachStep || !isForeachStep(foreachStep)) {
        continue;
      }
      // if the step is a foreach, add the foreach schema to the step state schema
      stepsSchema = stepsSchema.extend({
        [node.stepId]: getForeachStateSchema(
          stepContextSchema.merge(z.object({ steps: stepsSchema })),
          foreachStep
        ),
      });
    }
  }
  return stepsSchema;
}
