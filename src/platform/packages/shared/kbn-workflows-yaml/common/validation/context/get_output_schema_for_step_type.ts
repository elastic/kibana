/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBuiltInStepDefinition, hitlAuditOutputFields } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowExecuteGraphNode } from '@kbn/workflows/graph';
import { isAtomic, isWorkflowExecute } from '@kbn/workflows/graph';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import { normalizeFieldsToJsonSchema } from '@kbn/workflows/spec/lib/field_conversion';
import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import type { WorkflowContextRegistry } from './registry';
import { structuralStepOutputSchemas } from './structural_step_output_schemas';
import { withUnknownPropertyMessage } from './unknown_property_message';
import { isDynamicValue } from '../../regex';

const waitForInputFallbackSchema: z.ZodSchema = z.record(z.string(), z.unknown());

const getUnknownOutputMessage = (
  workflowName: string,
  outputNames: readonly string[],
  field: string
): string =>
  outputNames.length > 0
    ? `Workflow "${workflowName}" doesn’t return an output named "${field}". It returns: ${outputNames.join(
        ', '
      )}`
    : `Workflow "${workflowName}" doesn’t return an output named "${field}". It returns no outputs`;

/**
 * The output of the workflow a `workflow.execute` step runs: what it declares, plus undeclared
 * values its completing `workflow.output` steps set, which the run passes on too. Undefined when
 * the called workflow isn't known, declares no outputs, or any field may come back.
 */
const getCalledWorkflowOutputSchema = (
  registry: WorkflowContextRegistry,
  node: WorkflowExecuteGraphNode
): z.ZodType | undefined => {
  const workflowId = node.configuration.with?.['workflow-id'];
  if (typeof workflowId !== 'string' || !workflowId || isDynamicValue(workflowId)) {
    return undefined;
  }
  const calledWorkflow = registry.getCalledWorkflowOutputs?.(workflowId);
  const declaredOutputs = normalizeFieldsToJsonSchema(calledWorkflow?.outputs);
  if (!calledWorkflow?.returnedOutputNames || !declaredOutputs?.properties) {
    return undefined;
  }

  const declaredNames = Object.keys(declaredOutputs.properties);
  const undeclaredNames = calledWorkflow.returnedOutputNames.filter(
    (name) => !declaredNames.includes(name)
  );
  const declaredSchema = buildFieldsZodValidator(declaredOutputs);
  if (undeclaredNames.length > 0 && !(declaredSchema instanceof z.ZodObject)) {
    return undefined;
  }
  const outputSchema =
    declaredSchema instanceof z.ZodObject && undeclaredNames.length > 0
      ? declaredSchema.extend(Object.fromEntries(undeclaredNames.map((name) => [name, z.any()])))
      : declaredSchema;
  const outputNames = [...declaredNames, ...undeclaredNames];
  return withUnknownPropertyMessage(outputSchema, (field) =>
    getUnknownOutputMessage(calledWorkflow.name, outputNames, field)
  );
};

export const getOutputSchemaForStepType = (
  registry: WorkflowContextRegistry,
  node: GraphNodeUnion
): z.ZodSchema => {
  // Handle internal actions with pattern matching first
  // TODO: add output schema support for elasticsearch.request and kibana.request connectors

  // waitForInput has a dynamic output schema derived from its with.schema field.
  // It is a built-in step so it is handled here directly rather than through the
  // extension registry (which is for user-space step types like data.map).
  if (node.stepType === 'waitForInput') {
    const jsonSchema =
      isAtomic(node) || 'configuration' in node
        ? ((node as { configuration?: { with?: { schema?: unknown } } }).configuration?.with
            ?.schema as Record<string, unknown> | undefined)
        : undefined;

    if (jsonSchema) {
      try {
        const zodSchema = fromJSONSchema(jsonSchema);
        if (zodSchema) {
          return z.object({
            response: zodSchema as z.ZodSchema,
            ...hitlAuditOutputFields,
          });
        }
      } catch {
        // fall through to permissive fallback
      }
    }
    return z.object({
      response: waitForInputFallbackSchema,
      ...hitlAuditOutputFields,
    });
  }

  if (isWorkflowExecute(node)) {
    const calledWorkflowOutputSchema = getCalledWorkflowOutputSchema(registry, node);
    if (calledWorkflowOutputSchema) {
      return calledWorkflowOutputSchema;
    }
  }

  if (node.stepType === 'waitForApproval') {
    const outputSchema = getBuiltInStepDefinition('waitForApproval')?.outputSchema;
    if (outputSchema) {
      return outputSchema as z.ZodSchema;
    }
  }

  if (isAtomic(node)) {
    const stepOutput = registry.getStepOutput(node.stepType);

    if (stepOutput) {
      try {
        if (stepOutput.getDynamicOutputSchema) {
          return stepOutput.getDynamicOutputSchema({
            input: node.configuration.with,
            config: node.configuration,
          });
        }
      } catch (error) {
        // If dynamic schema generation fails, fallback to static output schema
      }

      return stepOutput.outputSchema ?? z.unknown();
    }
  }

  const connector = registry.getConnector(node.stepType);

  if (connector) {
    if (!connector.outputSchema) {
      // throw new Error(`Output schema not found for step type ${stepType}`);
      return z.unknown();
    }
    return connector.outputSchema;
  }

  const structuralSchema = structuralStepOutputSchemas[node.stepType];
  if (structuralSchema) {
    return structuralSchema;
  }

  // Fallback to unknown if not found
  return z.unknown();
};
