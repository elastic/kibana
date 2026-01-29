/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DynamicStepContextSchema } from '@kbn/workflows';
import { getStepId } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { isEnterForeach } from '@kbn/workflows/graph';
import { z } from '@kbn/zod/v4';
import { getForeachStateSchema } from './get_foreach_state_schema';
import { getOutputSchemaForStepType } from './get_output_schema_for_step_type';

export function getStepsCollectionSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  workflowExecutionGraph: WorkflowGraph,
  stepName: string
) {
  const stepId = getStepId(stepName);
  const stepNode = workflowExecutionGraph.getStepNode(stepId);

  if (!stepNode) {
    throw new Error(`Step with id ${stepId} not found in the workflow graph.`);
  }
  // reverse predecessors so the earliest steps are first and will be available when we reach the later ones
  const predecessors = [...workflowExecutionGraph.getAllPredecessors(stepNode.id)].reverse();

  if (predecessors.length === 0) {
    return z.object({});
  }

  let stepsSchema = z.object({});
  for (const node of predecessors) {
    // Excluding triggers from the context for now. Maybe they should be included under 'triggers' key?
    if (node.type === 'trigger') {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (!isEnterForeach(node)) {
      stepsSchema = stepsSchema.extend({
        [node.stepId]: z.object({
          output: getOutputSchemaForStepType(node).optional(),
          error: z.any().optional(),
        }),
      });
    } else {
      // if the step is a foreach, add the foreach schema to the step state schema
      stepsSchema = stepsSchema.extend({
        [node.stepId]: getForeachStateSchema(
          stepContextSchema.merge(z.object({ steps: stepsSchema })),
          node.configuration
        ),
      });
    }
  }
  return stepsSchema;
}
