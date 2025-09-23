/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import type { WorkflowYaml, StepContext, ForEachStep, WorkflowContextSchema } from '@kbn/workflows';
import { StepContextSchema } from '@kbn/workflows';
import { getStepByNameFromNestedSteps } from '@kbn/workflows/definition';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import _ from 'lodash';
import { getWorkflowContextSchema } from './get_workflow_context_schema';
import { getForeachStateSchema } from './get_foreach_state_schema';
import { getStepsCollectionSchema } from './get_steps_collection_schema';
import { getNearestStepPath } from './get_nearest_step_path';

// Implementation should be the same as in the 'WorkflowContextManager.getContext' function
// src/platform/plugins/shared/workflows_execution_engine/server/workflow_context_manager/workflow_context_manager.ts
export function getContextSchemaForPath(
  definition: WorkflowYaml,
  workflowGraph: WorkflowGraph,
  path: Array<string | number>
) {
  let stepContextSchema = StepContextSchema;
  stepContextSchema = stepContextSchema.merge(getWorkflowContextSchema(definition));
  const nearestStepPath = getNearestStepPath(path);
  if (!nearestStepPath) {
    return stepContextSchema;
  }
  const nearestStep = _.get(definition, nearestStepPath);
  if (!nearestStep) {
    return stepContextSchema;
  }
  const stepsCollectionSchema = getStepsCollectionSchema(
    stepContextSchema as typeof WorkflowContextSchema,
    workflowGraph,
    definition,
    nearestStep.name
  );
  if (Object.keys(stepsCollectionSchema.shape).length > 0) {
    stepContextSchema = stepContextSchema.extend({
      steps: stepsCollectionSchema,
    });
  }
  const enrichments = getStepContextSchemaEnrichments(
    stepContextSchema,
    workflowGraph,
    definition,
    nearestStep.name
  );
  stepContextSchema = stepContextSchema.extend(enrichments);
  return stepContextSchema satisfies z.ZodType<StepContext>;
}

function getStepContextSchemaEnrichments(
  stepContextSchema: z.ZodType,
  workflowExecutionGraph: WorkflowGraph,
  workflowDefinition: WorkflowYaml,
  stepId: string
) {
  const enrichments: { foreach?: z.ZodType } = {};
  const predecessors = workflowExecutionGraph.getAllPredecessors(stepId);
  for (const node of predecessors) {
    if (node.stepType === 'foreach') {
      // if one of the predecessors is a foreach, we need to enrich the step context with the foreach state
      const foreachStep = getStepByNameFromNestedSteps(workflowDefinition.steps, node.stepId);
      if (!foreachStep || foreachStep.type !== 'foreach') {
        continue;
      }
      enrichments.foreach = getForeachStateSchema(stepContextSchema, foreachStep as ForEachStep);
    }
  }
  return enrichments;
}
