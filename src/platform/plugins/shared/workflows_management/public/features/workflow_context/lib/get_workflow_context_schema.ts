/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowInput, WorkflowOutput, WorkflowYaml } from '@kbn/workflows';
import { WorkflowContextSchema } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { inferZodType } from '../../../../common/lib/zod';

/**
 * Converts workflow input/output definition to Zod schema
 * Used for both inputs and outputs to maintain consistency
 */
function fieldToSchema(field: WorkflowInput | WorkflowOutput): z.ZodType {
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
    case 'choice':
      const opts = field.options ?? [];
      valueSchema = z.any();
      if (opts.length > 0) {
        const literals = opts.map((o) => z.literal(o));
        valueSchema = z.union(literals);
      }
      break;
    case 'array': {
      // Create a union of all possible array types to show comprehensive type information
      // This allows the type description to show "string[] | number[] | boolean[]"
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

  // Apply default value if defined (only for inputs)
  if ('default' in field && field.default !== undefined) {
    valueSchema = valueSchema.default(field.default);
  }

  return valueSchema;
}

export function getWorkflowContextSchema(definition: WorkflowYaml) {
  return WorkflowContextSchema.extend({
    inputs: z.object({
      ...Object.fromEntries(
        (definition.inputs || []).map((input) => [input.name, fieldToSchema(input)])
      ),
    }),
    output: z.object({
      ...Object.fromEntries(
        (definition.outputs || []).map((output) => [output.name, fieldToSchema(output)])
      ),
    }),
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
