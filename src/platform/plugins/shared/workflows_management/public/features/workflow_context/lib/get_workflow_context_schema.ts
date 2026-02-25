/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import {
  AlertEventPropsSchema,
  BaseEventSchema,
  DynamicWorkflowContextSchema,
} from '@kbn/workflows';
import { normalizeInputsToJsonSchema } from '@kbn/workflows/spec/lib/input_conversion';
import { z } from '@kbn/zod/v4';
import { buildInputsZodValidator } from '../../../../common/lib/json_schema_to_zod';
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
  const inputsSchema = buildInputsZodValidator(normalizedInputs);

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
  // The merge() method requires both schemas to have the same base structure.
  // Cast to typeof DynamicWorkflowContextSchema because inputsSchema is ZodType<Record<string, unknown>>
  // (from buildInputsZodValidator) while the base schema expects ZodObject; runtime shape is compatible.
  return DynamicWorkflowContextSchema.extend({
    inputs: inputsSchema,
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
  }) as typeof DynamicWorkflowContextSchema;
}
