/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
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
  getWorkflowSettingsSchema,
  WaitStepSchema,
  WorkflowSchema,
  WorkflowSettingsSchema,
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
    return WorkflowSchema.partial().extend({
      settings: WorkflowSettingsSchema.optional(),
      steps: z.array(recursiveStepSchema).optional(),
    });
  }

  return WorkflowSchema.extend({
    settings: getWorkflowSettingsSchema(recursiveStepSchema, loose).optional(),
    steps: z.array(recursiveStepSchema),
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
  return BaseConnectorStepSchema.extend({
    type: connector.description
      ? z.literal(connector.type).describe(connector.description)
      : z.literal(connector.type),
    'connector-id': connector.connectorIdRequired ? z.string() : z.string().optional(),
    with: connector.paramsSchema,
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
      aliasSchemas.push(
        BaseConnectorStepSchema.extend({
          // Mark as deprecated in description so it's clear this is a legacy alias
          type: z.literal(oldType).describe(`Deprecated: Use ${newType} instead`),
          'connector-id': connector.connectorIdRequired ? z.string() : z.string().optional(),
          with: connector.paramsSchema,
          'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
        })
      );
    }
  }

  return aliasSchemas;
}
