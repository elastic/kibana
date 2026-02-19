/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import type { Document } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import {
  AlertEventPropsSchema,
  BaseEventSchema,
  DynamicWorkflowContextSchema,
} from '@kbn/workflows';
import { normalizeInputsToJsonSchema } from '@kbn/workflows/spec/lib/input_conversion';
import { z } from '@kbn/zod/v4';
import { convertJsonSchemaToZod } from '../../../../common/lib/json_schema_to_zod';
import { inferZodType } from '../../../../common/lib/zod';

// Type that accepts both WorkflowYaml (transformed) and raw definition (may have legacy inputs)
export type WorkflowDefinitionForContext =
  | WorkflowYaml
  | (Omit<WorkflowYaml, 'inputs'> & {
      inputs?:
        | WorkflowYaml['inputs']
        | Array<{ name: string; type: string; [key: string]: unknown }>;
    });

export function getWorkflowContextSchema(
  definition: WorkflowDefinitionForContext,
  yamlDocument?: Document | null
) {
  // If inputs is undefined, try to extract it from the YAML document
  let inputs = definition.inputs;
  if (inputs === undefined && yamlDocument) {
    try {
      const yamlJson = yamlDocument.toJSON();
      if (yamlJson && typeof yamlJson === 'object' && 'inputs' in yamlJson) {
        inputs = (yamlJson as Record<string, unknown>).inputs as typeof inputs;
      }
    } catch (e) {
      // Ignore errors when extracting from YAML
    }
  }

  // Normalize inputs to the new JSON Schema format (handles backward compatibility)
  // This handles both array (legacy) and object (new) formats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedInputs = normalizeInputsToJsonSchema(inputs as any);

  // Build the inputs object from the normalized JSON Schema structure
  const inputsObject: Record<string, z.ZodType> = {};

  if (normalizedInputs?.properties) {
    for (const [propertyName, propertySchema] of Object.entries(normalizedInputs.properties)) {
      // Skip null/undefined schemas (can happen when YAML is partially parsed)
      if (propertySchema && typeof propertySchema === 'object') {
        const jsonSchema = propertySchema as JSONSchema7;

        // Convert JSON Schema to Zod schema
        // Note: convertJsonSchemaToZod already handles defaults and optional for nested properties
        // We only need to apply defaults/optional at the top level here
        let valueSchema: z.ZodType = convertJsonSchemaToZod(jsonSchema);

        // Check if this property is required at the top level
        const isRequired = normalizedInputs.required?.includes(propertyName) ?? false;

        // Apply default value if present (default() automatically makes the field optional)
        if (jsonSchema.default !== undefined) {
          valueSchema = valueSchema.default(jsonSchema.default);
        } else if (!isRequired) {
          // Only apply optional if no default and not required
          // (default() already makes it optional, so we don't need both)
          valueSchema = valueSchema.optional();
        }

        inputsObject[propertyName] = valueSchema;
      }
    }
  }

  // Build event schema dynamically based on defined triggers.
  // Only include alert-specific properties (alerts, rule, params) when an alert trigger is present.
  // spaceId is always included via BaseEventSchema.
  const triggers = definition.triggers ?? [];
  const hasAlertTrigger = triggers.some((trigger) => trigger.type === 'alert');
  const eventSchema = hasAlertTrigger
    ? BaseEventSchema.merge(AlertEventPropsSchema).optional()
    : BaseEventSchema.optional();

  // Use DynamicWorkflowContextSchema instead of WorkflowContextSchema
  // This ensures compatibility with DynamicStepContextSchema.merge() in getContextSchemaForPath
  // The merge() method requires both schemas to have the same base structure
  return DynamicWorkflowContextSchema.extend({
    // transform inputs properties to an object
    // with the property name as the key and the Zod schema as the value
    // Always create an object, even if empty, to ensure proper schema structure
    inputs: Object.keys(inputsObject).length > 0 ? z.object(inputsObject) : z.object({}),
    // transform an object of consts to an object
    // with the const name as the key and inferred type as the value
    consts: z.object({
      ...Object.fromEntries(
        Object.entries(definition.consts ?? {}).map(([key, value]) => [
          key,
          inferZodType(value, { isConst: true }),
        ])
      ),
    }),
    // event schema is dynamic based on triggers
    event: eventSchema,
  });
}
