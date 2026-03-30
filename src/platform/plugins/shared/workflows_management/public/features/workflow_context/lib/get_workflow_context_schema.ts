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
import { DynamicWorkflowContextSchema, EventTimestampSchema, isTriggerType } from '@kbn/workflows';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import { normalizeFieldsToJsonSchema } from '@kbn/workflows/spec/lib/field_conversion';
import {
  AlertEventSchema,
  isAlertTrigger,
} from '@kbn/workflows/spec/schema/triggers/alert_trigger_schema';
import { isManualTrigger } from '@kbn/workflows/spec/schema/triggers/manual_trigger_schema';
import { z } from '@kbn/zod/v4';
import { inferZodType } from '../../../../common/lib/zod';
import { triggerSchemas } from '../../../trigger_schemas';

// Type that accepts both WorkflowYaml (transformed) and raw definition (may have legacy inputs)
export type WorkflowDefinitionForContext = WorkflowYaml;

function isZodObject(schema: z.ZodType): schema is z.ZodObject<z.ZodRawShape> {
  return schema instanceof z.ZodObject;
}

/**
 * Build event schema from workflow triggers: base (spaceId) + alert props when present + custom trigger event schemas.
 * Custom trigger event schemas are resolved via the triggerSchemas singleton (same pattern as stepSchemas for steps).
 * Uses shape spread instead of deprecated Zod v4 .merge().
 */
function buildEventSchemaFromTriggers(triggers: Array<{ type?: string }>): z.ZodType {
  const triggerEventSchemas: z.ZodType[] = [];

  for (const trigger of triggers.filter((t) => typeof t.type === 'string') as Array<{
    type: string;
  }>) {
    if (isAlertTrigger(trigger)) {
      triggerEventSchemas.push(AlertEventSchema);
    } else if (isManualTrigger(trigger)) {
      const eventShape: Record<string, z.ZodType> = {};

      if (trigger.inputs) {
        const inputs = normalizeFieldsToJsonSchema(trigger.inputs);
        eventShape.inputs = buildFieldsZodValidator(inputs);
      }

      triggerEventSchemas.push(z.object(eventShape));
    } else if (!isTriggerType(trigger.type)) {
      const def = triggerSchemas.getTriggerDefinition(trigger.type);
      if (def?.eventSchema && isZodObject(def.eventSchema)) {
        triggerEventSchemas.push(
          z.object({
            ...def.eventSchema.shape,
            ...(EventTimestampSchema as z.ZodObject<z.ZodRawShape>).shape,
          })
        );
      }
    }
  }

  if (triggerEventSchemas.length === 0) {
    return z.unknown().optional();
  }

  const schema =
    triggerEventSchemas.length === 1 ? triggerEventSchemas[0] : z.union(triggerEventSchemas);

  return schema.optional();
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
  const outputs = extractFieldFromYaml(definition.outputs, yamlDocument, 'outputs');

  const normalizedOutputs = normalizeFieldsToJsonSchema(outputs);

  const eventSchema = buildEventSchemaFromTriggers(definition.triggers ?? []);

  return DynamicWorkflowContextSchema.extend({
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
