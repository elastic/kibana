/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import type { WorkflowYaml } from '@kbn/workflows';
import { DynamicWorkflowContextSchema } from '@kbn/workflows';
import { normalizeInputsToJsonSchema } from '@kbn/workflows/spec/lib/input_conversion';
import { z } from '@kbn/zod';
import { convertJsonSchemaToZod } from '../../../../common/lib/json_schema_to_zod';
import { inferZodType } from '../../../../common/lib/zod';

export function getWorkflowContextSchema(definition: WorkflowYaml) {
  // Normalize inputs to the new JSON Schema format (handles backward compatibility)
  const normalizedInputs = normalizeInputsToJsonSchema(definition.inputs);

  // Build the inputs object from the normalized JSON Schema structure
  const inputsObject: Record<string, z.ZodType> = {};

  if (normalizedInputs?.properties) {
    for (const [propertyName, propertySchema] of Object.entries(normalizedInputs.properties)) {
      const jsonSchema = propertySchema as JSONSchema7;

      // Convert JSON Schema to Zod schema
      let valueSchema: z.ZodType = convertJsonSchemaToZod(jsonSchema);

      // Apply default value if present
      if (jsonSchema.default !== undefined) {
        valueSchema = valueSchema.default(jsonSchema.default);
      }

      // Check if this property is required
      const isRequired = normalizedInputs.required?.includes(propertyName) ?? false;
      if (!isRequired) {
        valueSchema = valueSchema.optional();
      }

      inputsObject[propertyName] = valueSchema;
    }
  }

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
  });
}
