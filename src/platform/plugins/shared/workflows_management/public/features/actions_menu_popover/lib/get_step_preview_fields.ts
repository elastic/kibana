/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getZodTypeName } from '@kbn/workflows-yaml';
import { z } from '@kbn/zod/v4';

export interface StepField {
  name: string;
  typeName: string;
  description?: string;
  required: boolean;
}

function formatZodTypeName(raw: string): string {
  if (raw.endsWith('[]')) {
    return `ARRAY<${formatZodTypeName(raw.slice(0, -2))}>`;
  }
  return raw.toUpperCase();
}

function unwrapSchema(schema: z.ZodType, depth = 0): z.ZodType {
  if (depth >= 10) return schema;
  const type = schema.def.type;
  if (type === 'optional')
    return unwrapSchema((schema as z.ZodOptional<z.ZodType>).unwrap(), depth + 1);
  if (type === 'default')
    return unwrapSchema((schema as z.ZodDefault<z.ZodType>).unwrap() as z.ZodType, depth + 1);
  if (type === 'lazy') return unwrapSchema((schema as z.ZodLazy<z.ZodType>).unwrap(), depth + 1);
  return schema;
}

export function getFieldsFromZodSchema(schema: z.ZodType | undefined): StepField[] {
  if (!schema) return [];
  const unwrapped = unwrapSchema(schema);
  if (!(unwrapped instanceof z.ZodObject)) return [];
  const shape = (unwrapped as z.ZodObject<Record<string, z.ZodType>>).shape;
  return Object.entries(shape).map(([name, fieldSchema]) => {
    const isOptional = fieldSchema instanceof z.ZodOptional || fieldSchema instanceof z.ZodDefault;
    const inner = isOptional ? unwrapSchema(fieldSchema as z.ZodType) : (fieldSchema as z.ZodType);
    const rawType = getZodTypeName(inner);
    return {
      name,
      typeName: formatZodTypeName(rawType),
      description: (inner as { description?: string }).description,
      required: !isOptional,
    };
  });
}
