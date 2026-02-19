/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import type { Document } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import { DynamicStepContextSchema } from '@kbn/workflows';
import { isEnterForeach, type WorkflowGraph } from '@kbn/workflows/graph';
import type { z } from '@kbn/zod/v4';
import { getForeachStateSchema } from './get_foreach_state_schema';
import { getNearestStepPath } from './get_nearest_step_path';
import { getStepsCollectionSchema } from './get_steps_collection_schema';
import { getVariablesSchema } from './get_variables_schema';
import { getWorkflowContextSchema } from './get_workflow_context_schema';

// Type that accepts both WorkflowYaml (transformed) and raw definition (may have legacy inputs)
type WorkflowDefinitionForContext =
  | WorkflowYaml
  | (Omit<WorkflowYaml, 'inputs'> & {
      inputs?:
        | WorkflowYaml['inputs']
        | Array<{ name: string; type: string; [key: string]: unknown }>;
    });

// Implementation should be the same as in the 'WorkflowContextManager.getContext' function
// src/platform/plugins/shared/workflows_execution_engine/server/workflow_context_manager/workflow_context_manager.ts
export function getContextSchemaForPath(
  definition: WorkflowDefinitionForContext,
  workflowGraph: WorkflowGraph,
  path: Array<string | number>,
  yamlDocument?: Document | null
): typeof DynamicStepContextSchema {
  // getWorkflowContextSchema normalizes inputs internally, so it can handle both formats
  // Pass yamlDocument to allow extraction of inputs if definition.inputs is undefined
  let schema = DynamicStepContextSchema.merge(
    getWorkflowContextSchema(definition as WorkflowYaml, yamlDocument)
  );

  const nearestStepPath = getNearestStepPath(path);
  if (!nearestStepPath) {
    return schema;
  }
  const nearestStep = _.get(definition, nearestStepPath);
  if (!nearestStep) {
    return schema;
  }

  const stepsCollectionSchema = getStepsCollectionSchema(schema, workflowGraph, nearestStep.name);

  if (Object.keys(stepsCollectionSchema.shape).length > 0) {
    schema = schema.extend({ steps: stepsCollectionSchema });
  }

  const variablesSchema = getVariablesSchema(workflowGraph, nearestStep.name);
  schema = schema.extend({ variables: variablesSchema });

  const enrichments = getStepContextSchemaEnrichmentEntries(
    schema,
    workflowGraph,
    nearestStep.name
  );

  for (const enrichment of enrichments) {
    schema = schema.extend({ [enrichment.key]: enrichment.value });
  }

  return schema;
}

function getStepContextSchemaEnrichmentEntries(
  stepContextSchema: typeof DynamicStepContextSchema,
  workflowExecutionGraph: WorkflowGraph,
  stepId: string
) {
  const enrichments: { key: 'foreach'; value: z.ZodType }[] = [];
  const stack = workflowExecutionGraph.getNodeStack(stepId);

  for (const nodeId of stack) {
    const node = workflowExecutionGraph.getNode(nodeId);

    if (isEnterForeach(node)) {
      enrichments.push({
        key: 'foreach',
        value: getForeachStateSchema(stepContextSchema, node.configuration),
      });
    }
  }
  return enrichments;
}
