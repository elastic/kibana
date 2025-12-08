/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { convertLegacyInputsToJsonSchema } from './input_conversion';
import { type ConnectorContractUnion } from '../..';
import {
  BaseConnectorStepSchema,
  getForEachStepSchema,
  getHttpStepSchema,
  getIfStepSchema,
  getMergeStepSchema,
  getOnFailureStepSchema,
  getParallelStepSchema,
  getWorkflowSettingsSchema,
  JsonModelSchema,
  TriggerSchema,
  WaitStepSchema,
  WorkflowConstsSchema,
  WorkflowInputSchema,
  WorkflowSchemaForAutocompleteBase,
} from '../schema';

export function getStepId(stepName: string): string {
  // Using step name as is, don't do any escaping to match the workflow engine behavior
  // Leaving this function in case we'd to change behaviour in future.
  return stepName;
}

export function generateYamlSchemaFromConnectors(
  connectors: ConnectorContractUnion[],
  /**
   * @deprecated use WorkflowSchemaForAutocomplete instead
   */
  loose: boolean = false
) {
  const recursiveStepSchema = createRecursiveStepSchema(connectors, loose);

  if (loose) {
    // For loose mode, use WorkflowSchemaForAutocompleteBase which already handles partial fields
    // We use the base schema (without transform) so we can extend it
    return WorkflowSchemaForAutocompleteBase.extend({
      steps: z.array(recursiveStepSchema).optional(),
    }).transform((data) => ({
      ...data,
      version: '1' as const,
    }));
  }

  // For strict mode, we need to build from the base schema before the pipe
  // since WorkflowSchema uses .pipe() which doesn't support .extend()
  const baseWorkflowSchema = z.object({
    version: z.literal('1').default('1').describe('The version of the workflow schema'),
    name: z.string().min(1),
    description: z.string().optional(),
    settings: getWorkflowSettingsSchema(recursiveStepSchema, loose).optional(),
    enabled: z.boolean().default(true),
    tags: z.array(z.string()).optional(),
    triggers: z.array(TriggerSchema).min(1),
    inputs: z
      .union([JsonModelSchema, z.array(WorkflowInputSchema)])
      .optional()
      .transform((inputs) => {
        if (!inputs) {
          return undefined;
        }
        if ('properties' in inputs && typeof inputs === 'object' && !Array.isArray(inputs)) {
          return inputs as z.infer<typeof JsonModelSchema>;
        }
        if (Array.isArray(inputs)) {
          return convertLegacyInputsToJsonSchema(inputs);
        }
        return undefined;
      }),
    consts: WorkflowConstsSchema.optional(),
    steps: z.array(recursiveStepSchema),
  });

  return baseWorkflowSchema.transform((data) => {
    // Transform inputs from legacy array format to JSON Schema format
    let normalizedInputs: z.infer<typeof JsonModelSchema> | undefined;
    if (data.inputs) {
      if (
        'properties' in data.inputs &&
        typeof data.inputs === 'object' &&
        !Array.isArray(data.inputs)
      ) {
        normalizedInputs = data.inputs as z.infer<typeof JsonModelSchema>;
      } else if (Array.isArray(data.inputs)) {
        normalizedInputs = convertLegacyInputsToJsonSchema(data.inputs);
      }
    }

    return {
      version: '1' as const,
      name: data.name,
      description: data.description,
      settings: data.settings,
      enabled: data.enabled,
      tags: data.tags,
      triggers: data.triggers,
      inputs: normalizedInputs,
      consts: data.consts,
      steps: data.steps,
    };
  });
}

function createRecursiveStepSchema(
  connectors: ConnectorContractUnion[],
  loose: boolean = false
): z.ZodType {
  // Use a simpler approach to avoid infinite recursion during validation
  // Create the step schema with limited recursion depth
  const stepSchema: z.ZodType = z.lazy(() => {
    // Create step schemas with the recursive reference
    // Use the same stepSchema reference to maintain consistency
    const forEachSchema = getForEachStepSchema(stepSchema, loose);
    const ifSchema = getIfStepSchema(stepSchema, loose);
    const parallelSchema = getParallelStepSchema(stepSchema, loose);
    const mergeSchema = getMergeStepSchema(stepSchema, loose);
    const httpSchema = getHttpStepSchema(stepSchema, loose);

    const connectorSchemas = connectors.map((c) =>
      generateStepSchemaForConnector(c, stepSchema, loose)
    );

    // Return discriminated union with all step types
    // This creates proper JSON schema validation that Monaco YAML can handle
    return z.discriminatedUnion('type', [
      forEachSchema,
      ifSchema,
      parallelSchema,
      mergeSchema,
      WaitStepSchema,
      httpSchema,
      ...connectorSchemas,
    ]);
  });

  return stepSchema;
}

function generateStepSchemaForConnector(
  connector: ConnectorContractUnion,
  stepSchema: z.ZodType,
  loose: boolean = false
) {
  return BaseConnectorStepSchema.extend({
    type: connector.description
      ? z.literal(connector.type).describe(connector.description)
      : z.literal(connector.type),
    'connector-id': connector.connectorIdRequired ? z.string() : z.string().optional(),
    with: connector.paramsSchema,
    'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
  });
}
