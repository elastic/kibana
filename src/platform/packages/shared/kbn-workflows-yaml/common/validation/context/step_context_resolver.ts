/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import { DynamicStepContextSchema } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { getContextSchemaForStep } from './get_context_for_path';
import { getWorkflowContextSchema } from './get_workflow_context_schema';
import type { WorkflowContextRegistry } from './registry';

/** Shares step context schemas across validators within one validation run. */
export interface StepContextResolver {
  readonly baseSchema: typeof DynamicStepContextSchema;
  forStep(stepName?: string): typeof DynamicStepContextSchema;
}

export function createStepContextResolver(
  registry: WorkflowContextRegistry,
  workflowDefinition: WorkflowYaml,
  workflowGraph: WorkflowGraph,
  yamlDocument?: Document | null
): StepContextResolver {
  const baseSchema = DynamicStepContextSchema.merge(
    getWorkflowContextSchema(registry, workflowDefinition, yamlDocument)
  ) as typeof DynamicStepContextSchema;

  const byStepName = new Map<string, typeof DynamicStepContextSchema>();

  return {
    baseSchema,
    forStep(stepName?: string) {
      if (!stepName) {
        return baseSchema;
      }
      const cached = byStepName.get(stepName);
      if (cached) {
        return cached;
      }
      const schema = getContextSchemaForStep(registry, baseSchema, workflowGraph, stepName);
      byStepName.set(stepName, schema);
      return schema;
    },
  };
}
