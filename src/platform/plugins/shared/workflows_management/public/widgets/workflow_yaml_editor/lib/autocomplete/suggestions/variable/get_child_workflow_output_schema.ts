/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import type { WorkflowOutput, WorkflowYaml } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

/**
 * Convert workflow output definition to Zod schema
 */
function outputToSchema(output: WorkflowOutput): z.ZodType {
  let valueSchema: z.ZodType;
  switch (output.type) {
    case 'string':
      valueSchema = z.string();
      break;
    case 'number':
      valueSchema = z.number();
      break;
    case 'boolean':
      valueSchema = z.boolean();
      break;
    case 'choice':
      const opts = output.options ?? [];
      valueSchema = z.any();
      if (opts.length > 0) {
        const literals = opts.map((o) => z.literal(o));
        valueSchema = z.union(literals);
      }
      break;
    case 'array': {
      const arraySchemas = [z.array(z.string()), z.array(z.number()), z.array(z.boolean())];
      const { minItems, maxItems } = output;
      const applyConstraints = (schema: z.ZodArray<z.ZodString | z.ZodNumber | z.ZodBoolean>) => {
        let s = schema;
        if (minItems != null) s = s.min(minItems);
        if (maxItems != null) s = s.max(maxItems);
        return s;
      };
      valueSchema = z.union(
        arraySchemas.map(applyConstraints) as [
          z.ZodArray<z.ZodString>,
          z.ZodArray<z.ZodNumber>,
          z.ZodArray<z.ZodBoolean>
        ]
      );
      break;
    }
    default:
      valueSchema = z.any();
      break;
  }

  // Mark as optional if not required
  return output.required === true ? valueSchema : valueSchema.optional();
}

/**
 * Build schema for child workflow outputs based on its outputs definition
 */
export function getChildWorkflowOutputSchema(childWorkflow: WorkflowYaml): z.ZodType {
  if (!childWorkflow.outputs || childWorkflow.outputs.length === 0) {
    // If no outputs declared, return a permissive object schema
    return z.record(z.string(), z.any());
  }

  // Build object schema from declared outputs
  const schemaShape: Record<string, z.ZodType> = {};
  for (const output of childWorkflow.outputs) {
    schemaShape[output.name] = outputToSchema(output);
  }

  return z.object(schemaShape);
}

/**
 * Extract workflow-id from a workflow.execute step configuration
 */
export function extractWorkflowIdFromStep(
  yamlDocument: Document,
  stepIndex: number
): string | null {
  try {
    const stepsNode = yamlDocument.getIn(['steps']) as YAMLSeq;
    if (!stepsNode || !stepsNode.items || !Array.isArray(stepsNode.items)) {
      return null;
    }

    const stepNode = stepsNode.items[stepIndex] as YAMLMap;
    if (!stepNode) {
      return null;
    }

    // Try to get workflow-id from the 'with' block
    const withNode = stepNode.getIn?.(['with']) as YAMLMap | undefined;
    if (withNode) {
      const workflowIdNode = withNode.getIn?.(['workflow-id']) as Scalar | undefined;
      if (workflowIdNode && typeof workflowIdNode.value === 'string') {
        return workflowIdNode.value;
      }
    }

    // Also check for direct workflow-id property (legacy format)
    const workflowIdNode = stepNode.getIn?.(['workflow-id']) as Scalar | undefined;
    if (workflowIdNode && typeof workflowIdNode.value === 'string') {
      return workflowIdNode.value;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a step is a workflow.execute or workflow.executeAsync step
 */
export function isWorkflowExecuteStep(stepType: string | null): boolean {
  return stepType === 'workflow.execute' || stepType === 'workflow.executeAsync';
}

/**
 * Find the step index for a given step ID in the YAML document
 */
export function findStepIndexByStepId(yamlDocument: Document, stepId: string): number | null {
  try {
    const stepsNode = yamlDocument.getIn(['steps']) as YAMLSeq;
    if (!stepsNode || !stepsNode.items || !Array.isArray(stepsNode.items)) {
      return null;
    }

    for (let i = 0; i < stepsNode.items.length; i++) {
      const stepNode = stepsNode.items[i] as YAMLMap;
      const nameNode = stepNode.getIn?.(['name']) as Scalar | undefined;
      if (nameNode && nameNode.value === stepId) {
        return i;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}
