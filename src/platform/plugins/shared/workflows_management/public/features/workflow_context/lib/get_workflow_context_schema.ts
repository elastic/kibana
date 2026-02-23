/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { WorkflowOutput, WorkflowYaml } from '@kbn/workflows';
import {
  AlertEventPropsSchema,
  BaseEventSchema,
  buildZodSchemaFromFields,
  DynamicWorkflowContextSchema,
  isTriggerType,
} from '@kbn/workflows';
import { normalizeInputsToJsonSchema } from '@kbn/workflows/spec/lib/input_conversion';
import { z } from '@kbn/zod/v4';
import { buildInputsZodValidator } from '../../../../common/lib/json_schema_to_zod';
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
        });
      }
    }
  }
  return eventSchema.optional();
}

function outputToSchema(field: WorkflowOutput): z.ZodType {
  let valueSchema: z.ZodType;
  switch (field.type) {
    case 'string':
      valueSchema = z.string();
      break;
    case 'number':
      valueSchema = z.number();
      break;
    case 'boolean':
      valueSchema = z.boolean();
      break;
    case 'choice': {
      const opts = field.options ?? [];
      valueSchema = z.any();
      if (opts.length > 0) {
        const literals = opts.map((o) => z.literal(o));
        valueSchema = z.union(literals);
      }
      break;
    }
    case 'array': {
      const arraySchemas = [z.array(z.string()), z.array(z.number()), z.array(z.boolean())];
      const { minItems, maxItems } = field;
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
  return valueSchema;
}

function buildOutputsSchema(
  outputs: WorkflowOutput[] | undefined
): z.ZodObject<Record<string, z.ZodType>> {
  if (!outputs?.length) {
    return z.object({});
  }
  return buildZodSchemaFromFields(outputs, { optionalIfNotRequired: false });
}

export function getWorkflowContextSchema(
  definition: WorkflowDefinitionForContext,
  yamlDocument?: Document | null
): typeof DynamicWorkflowContextSchema {
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

  const eventSchema = buildEventSchemaFromTriggers(definition.triggers ?? []);

  // Use DynamicWorkflowContextSchema instead of WorkflowContextSchema
  // This ensures compatibility with DynamicStepContextSchema.merge() in getContextSchemaForPath
  // The merge() method requires both schemas to have the same base structure.
  // Cast to typeof DynamicWorkflowContextSchema because inputsSchema is ZodType<Record<string, unknown>>
  // (from buildInputsZodValidator) while the base schema expects ZodObject; runtime shape is compatible.
  return DynamicWorkflowContextSchema.extend({
    inputs: inputsSchema,
    output: buildOutputsSchema(definition.outputs as WorkflowOutput[] | undefined),
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
