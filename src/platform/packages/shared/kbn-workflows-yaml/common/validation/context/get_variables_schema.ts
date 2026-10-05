/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStepId } from '@kbn/workflows';
import { isDataSet, type GraphNodeUnion, type WorkflowGraph } from '@kbn/workflows/graph';
import { getSchemaAtPath } from '@kbn/workflows/common/utils/zod/get_schema_at_path';
import { z } from '@kbn/zod/v4';
import { isDynamicValue, matchVariable } from '../../regex';
import { inferZodType } from '../../zod/infer_zod_type';
import { parseVariablePath } from '../parse_variable_path';

const EMPTY_VARIABLES_SCHEMA = z.object({}).optional();

/**
 * Infers the type of a data.set value. `${{ path }}` keeps the type of the referenced
 * value at runtime, so it resolves against the context; anything else is inferred as-is.
 */
const inferVariableType = (value: unknown, contextSchema?: z.ZodType): z.ZodType => {
  if (typeof value !== 'string' || !isDynamicValue(value)) {
    return inferZodType(value);
  }
  const key = matchVariable(value)?.groups.key;
  const parsedPath = key ? parseVariablePath(key) : null;
  // Filters can change the type, so only a bare path is resolved
  if (!contextSchema || !parsedPath?.propertyPath || parsedPath.filters.length > 0) {
    return z.unknown();
  }
  return getSchemaAtPath(contextSchema, parsedPath.propertyPath).schema ?? z.unknown();
};

export function getVariablesSchema(
  workflowExecutionGraph: WorkflowGraph,
  stepName: string,
  precomputedPredecessors?: GraphNodeUnion[],
  contextSchema?: z.ZodObject
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

  const dataSetSteps = predecessors.filter(isDataSet);

  if (dataSetSteps.length === 0) {
    return EMPTY_VARIABLES_SCHEMA;
  }

  // Predecessors come nearest-first; resolve in execution order so that a step can reference
  // variables set before it and a later step overrides an earlier one
  const executionOrder = new Map(
    workflowExecutionGraph.topologicalOrder.map((nodeId, index) => [nodeId, index])
  );
  dataSetSteps.sort((a, b) => (executionOrder.get(a.id) ?? 0) - (executionOrder.get(b.id) ?? 0));

  const allFields: Record<string, z.ZodTypeAny> = {};

  for (const node of dataSetSteps) {
    if (node.configuration.with) {
      const withConfig = node.configuration.with as Record<string, unknown>;
      // A data.set step can reference variables set by an earlier data.set step
      const resolutionSchema = contextSchema?.extend({ variables: z.object({ ...allFields }) });
      for (const key of Object.keys(withConfig)) {
        allFields[key] = inferVariableType(withConfig[key], resolutionSchema);
      }
    }
  }

  return z.object(allFields).optional();
}
