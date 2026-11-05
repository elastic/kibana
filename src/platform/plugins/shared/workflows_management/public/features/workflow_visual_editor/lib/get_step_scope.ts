/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { unwrapSchema } from '@kbn/workflows/common/utils/zod';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowContextRegistry } from '@kbn/workflows-yaml';
import { createStepContextResolver } from '@kbn/workflows-yaml';
import { z } from '@kbn/zod/v4';
import type { StepScopeSchemas } from './build_data_reference_catalog';

/**
 * The context keys the editor's resolver adds around a step. `steps`, `event`, `consts` and the
 * rest already have their own picker groups, so only these are taken.
 */
const STEP_SCOPE_KEYS = ['foreach', 'while', 'variables', 'item', 'index'] as const;

/** `variables` is always present, but empty until a Set Variables step runs before the step. */
const isEmptyVariables = (key: string, schema: z.ZodType): boolean => {
  const inner = unwrapSchema(schema);
  return (
    key === 'variables' && inner instanceof z.ZodObject && Object.keys(inner.shape).length === 0
  );
};

/**
 * What a step can read from the scope it runs in: the loop around it, variables set before it,
 * and Map Collection's `item` / `index`. It asks the same resolver the YAML editor uses, so the
 * picker and the editor agree. Empty when the step is outside any scope or isn't in the graph.
 */
export const getStepScope = ({
  registry,
  definition,
  graph,
  stepName,
}: {
  registry: WorkflowContextRegistry;
  definition: WorkflowYaml;
  graph: WorkflowGraph;
  stepName: string;
}): StepScopeSchemas => {
  const shape: Readonly<Record<string, z.ZodType | undefined>> = createStepContextResolver(
    registry,
    definition,
    graph
  ).forStep(stepName).shape;

  const scope: Record<string, z.ZodType> = {};
  STEP_SCOPE_KEYS.forEach((key) => {
    const schema = shape[key];
    if (schema && !isEmptyVariables(key, schema)) scope[key] = schema;
  });
  return scope;
};
