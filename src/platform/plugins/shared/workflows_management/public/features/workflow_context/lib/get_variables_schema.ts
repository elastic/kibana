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
import { DataSetStepTypeId } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';

function inferZodTypeFromValue(value: unknown): z.ZodTypeAny {
  if (typeof value === 'string') {
    return z.string();
  }
  if (typeof value === 'number') {
    return z.number();
  }
  if (typeof value === 'boolean') {
    return z.boolean();
  }
  if (value === null) {
    return z.null();
  }
  if (value === undefined) {
    return z.undefined();
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return z.array(z.unknown());
    }
    const firstElementType = inferZodTypeFromValue(value[0]);
    return z.array(firstElementType);
  }
  if (typeof value === 'object') {
    const objectSchema: Record<string, z.ZodTypeAny> = {};
    for (const key of Object.keys(value)) {
      objectSchema[key] = inferZodTypeFromValue((value as Record<string, unknown>)[key]);
    }
    return z.object(objectSchema);
  }
  return z.unknown();
}

export function getVariablesSchema(workflowExecutionGraph: WorkflowGraph, stepName: string) {
  const stepId = getStepId(stepName);
  const stepNode =
    workflowExecutionGraph.getNode(stepId) ||
    workflowExecutionGraph.getNode(`enterForeach_${stepId}`) ||
    workflowExecutionGraph.getNode(`enterCondition_${stepId}`);

  if (!stepNode) {
    return z.object({}).optional();
  }

  const predecessors = workflowExecutionGraph.getAllPredecessors(stepNode.id);
  const dataSetSteps = predecessors.filter((node) => node.stepType === DataSetStepTypeId);

  if (dataSetSteps.length === 0) {
    return z.object({}).optional();
  }

  let variablesSchema = z.object({});

  for (const node of dataSetSteps) {
    if (node.type === 'atomic' && node.configuration.with) {
      const withConfig = node.configuration.with;
      const stepSchema: Record<string, z.ZodTypeAny> = {};

      for (const key of Object.keys(withConfig)) {
        const value = withConfig[key];
        stepSchema[key] = inferZodTypeFromValue(value);
      }

      variablesSchema = variablesSchema.extend(stepSchema);
    }
  }

  return variablesSchema.optional();
}
