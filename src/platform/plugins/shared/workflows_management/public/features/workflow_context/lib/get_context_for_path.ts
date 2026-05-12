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
import { DynamicStepContextSchema, getStepId, WhileContextSchema } from '@kbn/workflows';
import { isAtomic, isEnterForeach, isEnterWhile, type WorkflowGraph } from '@kbn/workflows/graph';
import { DataMapStepTypeId } from '@kbn/workflows-extensions/common';
import type { z } from '@kbn/zod/v4';
import { getContextSchemaWithTemplateLocals } from './extend_context_with_template_locals';
import { getDataMapContextSchema } from './get_data_map_context_schema';
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

/**
 * Builds the step-level context schema for a given step name, without
 * template-local extension.
 */
export function getContextSchemaForStep(
  baseSchema: typeof DynamicStepContextSchema,
  workflowGraph: WorkflowGraph,
  stepName: string
): typeof DynamicStepContextSchema {
  const stepId = getStepId(stepName);
  const stepNode = workflowGraph.getStepNode(stepId);
  if (!stepNode) {
    return baseSchema;
  }
  const predecessors = workflowGraph.getAllPredecessors(stepNode.id);

  const extension: Record<string, z.ZodType> = {};

  // Zod's .extend() replaces fields entirely, dropping any .describe() text
  // from the base. Re-apply descriptions so the suggest widget can render
  // human-friendly hover text for dynamically-built fields.
  const STEP_FIELD_DESCRIBE: Record<string, string> = {
    steps: 'Outputs of previously executed steps in this run, keyed by step name.',
    variables: 'Step-scoped variables defined via set/var steps during this run.',
  };

  const stepsCollectionSchema = getStepsCollectionSchema(
    baseSchema,
    workflowGraph,
    stepName,
    predecessors
  );
  if (Object.keys(stepsCollectionSchema.shape).length > 0) {
    extension.steps = stepsCollectionSchema.describe(STEP_FIELD_DESCRIBE.steps);
  }

  extension.variables = getVariablesSchema(workflowGraph, stepName, predecessors).describe(
    STEP_FIELD_DESCRIBE.variables
  );

  let schema = baseSchema.extend(extension) as typeof DynamicStepContextSchema;

  const enrichments = getStepContextSchemaEnrichmentEntries(schema, workflowGraph, stepName);
  if (enrichments.length > 0) {
    const enrichmentShape: Record<string, z.ZodType> = {};
    for (const enrichment of enrichments) {
      enrichmentShape[enrichment.key] = enrichment.value;
    }
    schema = schema.extend(enrichmentShape) as typeof DynamicStepContextSchema;
  }

  return schema;
}

// Implementation should be the same as in the 'WorkflowContextManager.getContext' function
// src/platform/plugins/shared/workflows_execution_engine/server/workflow_context_manager/workflow_context_manager.ts
export function getContextSchemaForPath(
  definition: WorkflowDefinitionForContext,
  workflowGraph: WorkflowGraph,
  path: Array<string | number>,
  yamlDocument?: Document | null,
  offset?: number
): typeof DynamicStepContextSchema {
  let schema: typeof DynamicStepContextSchema = DynamicStepContextSchema.merge(
    getWorkflowContextSchema(definition as WorkflowYaml, yamlDocument)
  ) as typeof DynamicStepContextSchema;

  const nearestStepPath = getNearestStepPath(path);
  if (!nearestStepPath) {
    return maybeExtendWithTemplateLocals(schema, yamlDocument, offset);
  }
  const nearestStep = _.get(definition, nearestStepPath);
  if (!nearestStep) {
    return maybeExtendWithTemplateLocals(schema, yamlDocument, offset);
  }

  schema = getContextSchemaForStep(schema, workflowGraph, nearestStep.name);

  return maybeExtendWithTemplateLocals(schema, yamlDocument, offset);
}

function maybeExtendWithTemplateLocals(
  schema: typeof DynamicStepContextSchema,
  yamlDocument?: Document | null,
  offset?: number
): typeof DynamicStepContextSchema {
  if (yamlDocument != null && offset !== undefined) {
    return getContextSchemaWithTemplateLocals(yamlDocument, offset, schema);
  }
  return schema;
}

function getStepContextSchemaEnrichmentEntries(
  stepContextSchema: typeof DynamicStepContextSchema,
  workflowExecutionGraph: WorkflowGraph,
  stepId: string
) {
  const enrichments: { key: 'foreach' | 'while' | 'item' | 'index'; value: z.ZodType }[] = [];
  const stack = workflowExecutionGraph.getNodeStack(stepId);

  // Hover-text for dynamically-added enrichment fields. Matches the wording
  // used on StepContextSchema in @kbn/workflows/spec/schema.ts.
  const ENRICHMENT_DESCRIBE = {
    foreach: 'Current iteration state inside a foreach step (item, index, total).',
    while: 'Current iteration count inside a while step.',
    item: 'The current item from the foreach collection.',
    index: 'Zero-based position of the current item in the foreach collection.',
  } as const;

  for (const nodeId of stack) {
    const node = workflowExecutionGraph.getNode(nodeId);

    if (isEnterForeach(node)) {
      enrichments.push({
        key: 'foreach',
        value: getForeachStateSchema(stepContextSchema, node.configuration).describe(
          ENRICHMENT_DESCRIBE.foreach
        ),
      });
    }

    if (isEnterWhile(node)) {
      enrichments.push({
        key: 'while',
        value: WhileContextSchema.describe(ENRICHMENT_DESCRIBE.while),
      });
    }
  }

  // Container steps (while, foreach) are decomposed into enter/exit nodes in the
  // graph, so getNodeStack for the step name itself returns []. getStepNode
  // resolves the step name to its enter-* node via prefix lookup. If the step IS
  // a container, its own scope context should be available (e.g., while.iteration
  // in the condition field is evaluated per-iteration).
  const selfNode = workflowExecutionGraph.getStepNode(stepId);
  if (selfNode) {
    if (isEnterWhile(selfNode) && !enrichments.some((e) => e.key === 'while')) {
      enrichments.push({
        key: 'while',
        value: WhileContextSchema.describe(ENRICHMENT_DESCRIBE.while),
      });
    }

    if (selfNode.stepType === DataMapStepTypeId && isAtomic(selfNode)) {
      const { item, index } = getDataMapContextSchema(
        stepContextSchema,
        selfNode.configuration?.items
      );
      enrichments.push({ key: 'item', value: item.describe(ENRICHMENT_DESCRIBE.item) });
      enrichments.push({ key: 'index', value: index.describe(ENRICHMENT_DESCRIBE.index) });
    }
  }

  return enrichments;
}
