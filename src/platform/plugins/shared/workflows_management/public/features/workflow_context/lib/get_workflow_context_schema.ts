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
  EventTimestampSchema,
  isTriggerType,
} from '@kbn/workflows';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import { normalizeFieldsToJsonSchema } from '@kbn/workflows/spec/lib/field_conversion';
import { z } from '@kbn/zod/v4';
import { inferZodType } from '../../../../common/lib/zod';
import { triggerSchemas } from '../../../trigger_schemas';

// Type that accepts both WorkflowYaml (transformed) and raw definition (may have legacy inputs)
export type WorkflowDefinitionForContext =
  | WorkflowYaml
  | (Omit<WorkflowYaml, 'inputs'> & {
      inputs?:
        | WorkflowYaml['inputs']
        | Array<{ name: string; type: string; [key: string]: unknown }>;
    });

function isZodObject(schema: z.ZodType): schema is z.ZodObject<z.ZodRawShape> {
  return schema instanceof z.ZodObject;
}

/**
 * Build event schema from workflow triggers: base (spaceId) + alert props when present + custom trigger event schemas.
 * Custom trigger event schemas are resolved via the triggerSchemas singleton (same pattern as stepSchemas for steps).
 * Uses shape spread instead of deprecated Zod v4 .merge().
 */
function buildEventSchemaFromTriggers(triggers: Array<{ type?: string }>): z.ZodType {
  const hasAlertTrigger = triggers.some((trigger) => trigger.type === 'alert');
  let eventSchema: z.ZodType = hasAlertTrigger
    ? z.object({
        ...(BaseEventSchema as z.ZodObject<z.ZodRawShape>).shape,
        ...(AlertEventPropsSchema as z.ZodObject<z.ZodRawShape>).shape,
      })
    : BaseEventSchema;
  for (const trigger of triggers) {
    const type = trigger?.type;
    if (typeof type === 'string' && !isTriggerType(type)) {
      const def = triggerSchemas.getTriggerDefinition(type);
      if (def?.eventSchema && isZodObject(eventSchema) && isZodObject(def.eventSchema)) {
        eventSchema = z.object({
          ...eventSchema.shape,
          ...def.eventSchema.shape,
          ...(EventTimestampSchema as z.ZodObject<z.ZodRawShape>).shape,
        });
      }
    }
  }
  return eventSchema.optional();
}

/**
 * Extracts a field value from the definition, falling back to the YAML document if not present.
 */
function extractFieldFromYaml<T>(
  definitionValue: T | undefined,
  yamlDocument: Document | null | undefined,
  fieldName: string
): T | undefined {
  if (definitionValue !== undefined) {
    return definitionValue;
  }
  if (!yamlDocument) {
    return undefined;
  }
  try {
    const yamlJson = yamlDocument.toJSON();
    if (yamlJson && typeof yamlJson === 'object' && fieldName in yamlJson) {
      return (yamlJson as Record<string, unknown>)[fieldName] as T;
    }
  } catch {
    // Ignore errors when extracting from YAML
  }
  return undefined;
}

export function getWorkflowContextSchema(
  definition: WorkflowDefinitionForContext,
  yamlDocument?: Document | null
): typeof DynamicWorkflowContextSchema {
  const inputs = extractFieldFromYaml(definition.inputs, yamlDocument, 'inputs');
  const outputs = extractFieldFromYaml(definition.outputs, yamlDocument, 'outputs');

  const normalizedInputs = normalizeFieldsToJsonSchema(inputs);
  const normalizedOutputs = normalizeFieldsToJsonSchema(outputs);

  const eventSchema = buildEventSchemaFromTriggers(definition.triggers ?? []);

  return DynamicWorkflowContextSchema.extend({
    inputs: buildFieldsZodValidator(normalizedInputs),
    output: buildFieldsZodValidator(normalizedOutputs),
    consts: z.object({
      ...Object.fromEntries(
        Object.entries(definition.consts ?? {}).map(([key, value]) => [
          key,
          inferZodType(value, { isConst: true }),
        ])
      ),
    }),
    event: eventSchema,
  }) as typeof DynamicWorkflowContextSchema;
}
