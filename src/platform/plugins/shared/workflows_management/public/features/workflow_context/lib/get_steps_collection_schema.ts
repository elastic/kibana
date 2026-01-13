/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { DynamicStepContextSchema, WorkflowYaml } from '@kbn/workflows';
import { getStepId } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { isEnterForeach } from '@kbn/workflows/graph';
import { z } from '@kbn/zod/v4';
import { getForeachStateSchema } from './get_foreach_state_schema';
import { getOutputSchemaForStepType } from './get_output_schema_for_step_type';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';
import {
  extractWorkflowIdFromStep,
  findStepIndexByStepId,
  getChildWorkflowOutputSchema,
  isWorkflowExecuteStep,
} from '../../../widgets/workflow_yaml_editor/lib/autocomplete/suggestions/variable/get_child_workflow_output_schema';

/**
 * Get output schema for a step, with optional child workflow awareness
 */
function getStepOutputSchema(params: {
  node: GraphNodeUnion;
  yamlDocument?: Document;
  workflows?: WorkflowsResponse;
}): z.ZodSchema {
  const { node, yamlDocument, workflows } = params;

  // Try to get child workflow output schema if this is a workflow.execute step
  if (isWorkflowExecuteStep(node.stepType) && yamlDocument && workflows) {
    try {
      const stepIndex = findStepIndexByStepId(yamlDocument, node.stepId);
      if (stepIndex !== null) {
        const workflowId = extractWorkflowIdFromStep(yamlDocument, stepIndex);
        if (workflowId) {
          const childWorkflow = workflows.workflows[workflowId];
          if (childWorkflow) {
            return getChildWorkflowOutputSchema(childWorkflow as unknown as WorkflowYaml);
          }
        }
      }
    } catch (error) {
      // Fall back to default schema
    }
  }

  // Default behavior for all other steps
  return getOutputSchemaForStepType(node);
}

export function getStepsCollectionSchema(
  stepContextSchema: typeof DynamicStepContextSchema,
  workflowExecutionGraph: WorkflowGraph,
  stepName: string,
  yamlDocument?: Document,
  workflows?: WorkflowsResponse
) {
  const stepId = getStepId(stepName);
  const stepNode = workflowExecutionGraph.getStepNode(stepId);

  if (!stepNode) {
    throw new Error(`Step with id ${stepId} not found in the workflow graph.`);
  }
  // reverse predecessors so the earliest steps are first and will be available when we reach the later ones
  const predecessors = [...workflowExecutionGraph.getAllPredecessors(stepNode.id)].reverse();

  if (predecessors.length === 0) {
    return z.object({});
  }

  let stepsSchema = z.object({});
  for (const node of predecessors) {
    // Excluding triggers from the context for now. Maybe they should be included under 'triggers' key?
    if (node.type === 'trigger') {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (!isEnterForeach(node)) {
      const outputSchema = getStepOutputSchema({
        node,
        yamlDocument,
        workflows,
      });

      stepsSchema = stepsSchema.extend({
        [node.stepId]: z.object({
          output: outputSchema.optional(),
          error: z.any().optional(),
        }),
      });
    } else {
      // if the step is a foreach, add the foreach schema to the step state schema
      stepsSchema = stepsSchema.extend({
        [node.stepId]: getForeachStateSchema(
          stepContextSchema.merge(z.object({ steps: stepsSchema })),
          node.configuration
        ),
      });
    }
  }
  return stepsSchema;
}
