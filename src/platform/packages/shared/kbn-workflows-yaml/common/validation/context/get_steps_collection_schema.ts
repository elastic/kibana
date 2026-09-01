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
 * One `steps.<id>` entry per graph node, shared by every step context that can
 * see that node.
 *
 * The entry depends only on the node, so building a fresh one per context made
 * the schema-object count grow with the square of the step count: at 300 steps
 * the old code allocated ~45,000 wrappers around subschemas that were already
 * shared by reference. Keyed by node identity, so entries die with the graph,
 * which lives for one request.
 *
 * Only the non-foreach branch is shareable — a foreach entry closes over the
 * context of the step being resolved.
 */
const stepEntrySchemaCache = new WeakMap<GraphNodeUnion, z.ZodTypeAny>();

function getStepEntrySchema(node: GraphNodeUnion): z.ZodTypeAny {
  const cached = stepEntrySchemaCache.get(node);
  if (cached) {
    return cached;
  }
  const schema = z.lazy(() =>
    z.object({
      output: getOutputSchemaForStepType(node).optional(),
      error: z.any().optional(),
    })
  );
  stepEntrySchemaCache.set(node, schema);
  return schema;
}

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
  let batch: Record<string, z.ZodTypeAny> = {};

  const flushBatch = () => {
    if (Object.keys(batch).length > 0) {
      schema = schema.extend(batch);
      batch = {};
    }
  };

  for (const node of nodes) {
    if (seenStepIds.has(node.stepId) || node.type === 'trigger') {
      continue;
    }
    seenStepIds.add(node.stepId);

    if (!isEnterForeach(node)) {
      batch[node.stepId] = getStepEntrySchema(node);
    } else {
      flushBatch();
      schema = schema.extend({
        [node.stepId]: getForeachStateSchema(
          stepContextSchema.merge(z.object({ steps: schema })),
          node.configuration
        ),
      });
    }
  }

  flushBatch();
  return schema;
}

export function getStepsCollectionSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  workflowExecutionGraph: WorkflowGraph,
  stepName: string,
  precomputedPredecessors?: GraphNodeUnion[]
) {
  const stepId = getStepId(stepName);
  const stepNode = workflowExecutionGraph.getStepNode(stepId);

  if (!stepNode) {
    throw new Error(`Step with id ${stepId} not found in the workflow graph.`);
  }

  const rawPredecessors = precomputedPredecessors
    ? precomputedPredecessors
    : workflowExecutionGraph.getAllPredecessors(stepNode.id);

  // Reverse predecessors so the earliest steps are first and will be available when we reach the later ones.
  // Deduplicate by stepId: structural nodes (enter-if/exit-if, enter-foreach/exit-foreach, etc.)
  // share the same stepId, and processing both would cause the later one to overwrite the first.
  // We keep the first occurrence per stepId since the earliest node (e.g. enter-foreach) carries
  // the configuration needed for special schema handling (like getForeachStateSchema).
  const allPredecessors = [...rawPredecessors].reverse();
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
