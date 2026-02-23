/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { WorkflowOutput } from '../schema';

/**
 * Field shape shared by workflow inputs and outputs for Zod schema building.
 * Used to avoid duplicating the same type-to-Zod logic across execution, validation, and context schema.
 */
export interface WorkflowFieldForZod {
  name: string;
  type: WorkflowOutput['type'];
  required?: boolean;
  options?: string[];
  minItems?: number;
  maxItems?: number;
}

export interface BuildZodSchemaFromFieldsOptions {
  /**
   * When true (default), fields with required !== true get .optional().
   * When false, all fields are required (e.g. for context/autocomplete schema).
   */
  optionalIfNotRequired?: boolean;
}

/**
 * Builds a Zod object schema from an array of workflow output/input field definitions.
 * Single source of truth for the type-to-Zod mapping (string, number, boolean, choice, array).
 */
export function buildZodSchemaFromFields(
  fields: WorkflowFieldForZod[],
  options: BuildZodSchemaFromFieldsOptions = {}
): z.ZodObject<Record<string, z.ZodType>> {
  const { optionalIfNotRequired = true } = options;
  const acc: Record<string, z.ZodType> = {};

  for (const field of fields) {
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
        if (opts.length > 0) {
          valueSchema = z.enum(opts as [string, ...string[]]);
        } else {
          valueSchema = z.any();
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
    if (optionalIfNotRequired && !field.required) {
      valueSchema = valueSchema.optional();
    }
    acc[field.name] = valueSchema;
  }

  return Object.keys(acc).length > 0
    ? z.object(acc)
    : (z.object({}) as z.ZodObject<Record<string, z.ZodType>>);
}
