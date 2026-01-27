/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStepId } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { z } from '@kbn/zod/v4';
import { inferZodType } from '../../../../common/lib/zod';

export function getVariablesSchema(workflowExecutionGraph: WorkflowGraph, stepName: string) {
  const stepId = getStepId(stepName);
  const stepNode = workflowExecutionGraph.getStepNode(stepId);

  if (!stepNode) {
    return z.object({}).optional();
  }

  const predecessors = workflowExecutionGraph.getAllPredecessors(stepNode.id);
  const dataSetSteps = predecessors.filter((node) => node.stepType === 'data.set');

  if (dataSetSteps.length === 0) {
    return z.object({}).optional();
  }

  let variablesSchema = z.object({});

  for (const node of dataSetSteps) {
    if (node.type === 'data.set' && node.configuration.with) {
      const withConfig = node.configuration.with as Record<string, unknown>;
      const stepSchema: Record<string, z.ZodTypeAny> = {};

      for (const key of Object.keys(withConfig)) {
        const value = withConfig[key];
        stepSchema[key] = inferZodType(value);
      }

      variablesSchema = variablesSchema.extend(stepSchema);
    }
  }

  return variablesSchema.optional();
}
