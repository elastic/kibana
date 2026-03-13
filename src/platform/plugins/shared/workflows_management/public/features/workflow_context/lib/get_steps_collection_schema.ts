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
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { isEnterForeach, shouldSuggestInnerSteps } from '@kbn/workflows/graph';
import { z } from '@kbn/zod/v4';
import { getForeachStateSchema } from './get_foreach_state_schema';
import { getOutputSchemaForStepType } from './get_output_schema_for_step_type';

/**
 * Folds an array of graph nodes into a steps schema, skipping already-seen
 * and trigger nodes. Mutates `seenStepIds` to track which step IDs have been
 * processed across multiple calls.
 */
function addNodesToStepsSchema(
  nodes: GraphNodeUnion[],
  stepsSchema: z.ZodObject,
  seenStepIds: Set<string>,
  stepContextSchema: typeof DynamicStepContextSchema
): z.ZodObject {
  let schema = stepsSchema;

  for (const node of nodes) {
    if (seenStepIds.has(node.stepId) || node.type === 'trigger') {
      // eslint-disable-next-line no-continue
      continue;
    }
    seenStepIds.add(node.stepId);

    if (!isEnterForeach(node)) {
      schema = schema.extend({
        [node.stepId]: z.object({
          output: getOutputSchemaForStepType(node).optional(),
          error: z.any().optional(),
        }),
      });
    } else {
      schema = schema.extend({
        [node.stepId]: getForeachStateSchema(
          stepContextSchema.merge(z.object({ steps: schema })),
          node.configuration
        ),
      });
    }
  }

  return schema;
}

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
  // Reverse predecessors so the earliest steps are first and will be available when we reach the later ones.
  // Deduplicate by stepId: structural nodes (enter-if/exit-if, enter-foreach/exit-foreach, etc.)
  // share the same stepId, and processing both would cause the later one to overwrite the first.
  // We keep the first occurrence per stepId since the earliest node (e.g. enter-foreach) carries
  // the configuration needed for special schema handling (like getForeachStateSchema).
  const allPredecessors = [...workflowExecutionGraph.getAllPredecessors(stepNode.id)].reverse();
  const dedupIds = new Set<string>();
  const predecessors = allPredecessors.filter((node) => {
    if (dedupIds.has(node.stepId)) {
      return false;
    }
    dedupIds.add(node.stepId);
    return true;
  });

  const seenStepIds = new Set<string>();
  let stepsSchema = addNodesToStepsSchema(
    predecessors,
    z.object({}),
    seenStepIds,
    stepContextSchema
  );

  // For step types whose inner steps have guaranteed execution before certain
  // fields are evaluated (e.g. while with do-while semantics), include inner
  // step outputs so they are available for autocomplete suggestions.
  if (shouldSuggestInnerSteps(stepNode)) {
    const subGraph = workflowExecutionGraph.getStepGraph(stepId);
    const innerNodes = subGraph.getAllNodes().filter((node) => node.stepId !== stepId);
    stepsSchema = addNodesToStepsSchema(innerNodes, stepsSchema, seenStepIds, stepContextSchema);
  }

  return stepsSchema;
}
