/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStepId } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { inferZodType } from '@kbn/workflows-yaml';
import { z } from '@kbn/zod/v4';

const EMPTY_VARIABLES_SCHEMA = z.object({}).optional();

export function getVariablesSchema(
  workflowExecutionGraph: WorkflowGraph,
  stepName: string,
  precomputedPredecessors?: GraphNodeUnion[]
) {
  let predecessors: GraphNodeUnion[];

  if (precomputedPredecessors) {
    predecessors = precomputedPredecessors;
  } else {
    const stepId = getStepId(stepName);
    const stepNode = workflowExecutionGraph.getStepNode(stepId);
    if (!stepNode) {
      return EMPTY_VARIABLES_SCHEMA;
    }
    predecessors = workflowExecutionGraph.getAllPredecessors(stepNode.id);
  }

  const dataSetSteps = predecessors.filter((node) => node.stepType === 'data.set');

  if (dataSetSteps.length === 0) {
    return EMPTY_VARIABLES_SCHEMA;
  }

  const allFields: Record<string, z.ZodTypeAny> = {};

  for (const node of dataSetSteps) {
    if (node.type === 'data.set' && node.configuration.with) {
      const withConfig = node.configuration.with as Record<string, unknown>;
      for (const key of Object.keys(withConfig)) {
        allFields[key] = inferZodType(withConfig[key]);
      }
    }
  }

  return z.object(allFields).optional();
}
