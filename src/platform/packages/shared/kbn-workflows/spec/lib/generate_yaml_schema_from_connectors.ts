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
import { KIBANA_TYPE_ALIASES } from '../kibana/aliases';
import {
  BaseConnectorStepSchema,
  DataSetStepSchema,
  getForEachStepSchema,
  getHttpStepSchema,
  getIfStepSchema,
  getMergeStepSchema,
  getOnFailureStepSchema,
  getParallelStepSchema,
  getTriggerSchema,
  getWorkflowSettingsSchema,
  WaitStepSchema,
  WorkflowSchemaBase,
  WorkflowSchemaForAutocompleteBase,
  WorkflowSettingsSchema,
} from '../schema';
import type { JsonModelSchema } from '../schema/common/json_model_schema';

export function getStepId(stepName: string): string {
  // Using step name as is, don't do any escaping to match the workflow engine behavior
  // Leaving this function in case we'd to change behaviour in future.
  return stepName;
}

export function generateYamlSchemaFromConnectors(
  connectors: ConnectorContractUnion[],
  /** Registered custom trigger type ids for YAML schema validation (e.g. example.custom_trigger) */
  triggers: string[] = [],
  /**
   * @deprecated use WorkflowSchemaForAutocomplete instead
   */
  loose: boolean = false
): z.ZodType {
  const recursiveStepSchema = createRecursiveStepSchema(connectors, loose);

  if (loose) {
    // For loose mode, use WorkflowSchemaForAutocompleteBase which already handles partial fields
    // We use the base schema (without transform) so we can extend it
    return WorkflowSchemaForAutocompleteBase.extend({
      settings: WorkflowSettingsSchema.optional(),
      steps: z.array(recursiveStepSchema).optional(),
    }).transform((data) => ({
      ...data,
      version: '1' as const,
    }));
  }

  const triggerSchema = getTriggerSchema(triggers);
  const workflowBaseWithTriggers = WorkflowSchemaBase.extend({
    triggers: z.array(triggerSchema).min(1),
  });

  return workflowBaseWithTriggers
    .extend({
      settings: getWorkflowSettingsSchema(recursiveStepSchema, loose).optional(),
      steps: z.array(recursiveStepSchema),
    })
    .transform((data) => {
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
      const { inputs: _, ...rest } = data;
      return {
        ...rest,
        version: '1' as const,
        ...(normalizedInputs !== undefined && { inputs: normalizedInputs }),
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

    // Generate alias schemas for backward compatibility
    // These allow old type names to still validate, but they won't appear in autocomplete
    const aliasSchemas = generateAliasSchemas(connectors, stepSchema, loose);

    // Return discriminated union with all step types
    // This creates proper JSON schema validation that Monaco YAML can handle
    return z.discriminatedUnion('type', [
      forEachSchema,
      ifSchema,
      parallelSchema,
      mergeSchema,
      WaitStepSchema,
      DataSetStepSchema,
      httpSchema,
      ...connectorSchemas,
      ...aliasSchemas,
    ]);
  });

  return stepSchema;
}

function generateStepSchemaForConnector(
  connector: ConnectorContractUnion,
  stepSchema: z.ZodType,
  loose: boolean = false
) {
  const connectorIdSchema: Record<string, z.ZodType> = {};
  // Add connector-id schema if hasConnectorId has a value
  if (connector.hasConnectorId) {
    connectorIdSchema['connector-id'] =
      connector.hasConnectorId === 'required' ? z.string() : z.string().optional();
  }

  return BaseConnectorStepSchema.extend({
    type: connector.description
      ? z.literal(connector.type).describe(connector.description)
      : z.literal(connector.type),
    with: connector.paramsSchema,
    ...connectorIdSchema,
    'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
    ...(connector.configSchema && connector.configSchema.shape),
  });
}

/**
 * Generate schemas for backward-compatible type aliases.
 * These schemas use the old type names but reference the same connector definition.
 * They are included in validation but not shown in autocomplete suggestions.
 */
function generateAliasSchemas(
  connectors: ConnectorContractUnion[],
  stepSchema: z.ZodType,
  loose: boolean = false
): ReturnType<typeof generateStepSchemaForConnector>[] {
  const aliasSchemas: ReturnType<typeof generateStepSchemaForConnector>[] = [];

  for (const [oldType, newType] of Object.entries(KIBANA_TYPE_ALIASES)) {
    // Find the connector with the new type name
    const connector = connectors.find((c) => c.type === newType);
    if (connector) {
      // Create a schema with the old type name but same params/output
      const newSchema = generateStepSchemaForConnector(connector, stepSchema, loose);
      aliasSchemas.push(
        newSchema.extend({
          // Mark as deprecated in description so it's clear this is a legacy alias
          type: z.literal(oldType).describe(`Deprecated: Use ${newType} instead`),
        })
      );
    }
  }

  return aliasSchemas;
}
