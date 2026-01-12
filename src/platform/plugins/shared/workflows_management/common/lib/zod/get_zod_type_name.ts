/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export function getZodTypeName(schema: z.ZodType): string {
  return getZodTypeNameRecursively(schema);
}
/**
 * Get the string representation of the zod schema type
 * @param schema - The zod schema to get the name of.
 * @param depth - The depth of the schema.
 * @returns String representation of the zod schema type, unwrapping optional and default wrappers and resolving literals to their value.
 * @private
 */
function getZodTypeNameRecursively(schema: z.ZodType, depth: number = 0) {
  if (depth > 10) {
    return 'unknown';
  }
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodLazy
  ) {
    return getZodTypeNameRecursively(schema.unwrap() as z.ZodType, depth + 1);
  }
  const def = schema.def;
  switch (def.type) {
    case 'array':
      return getArrayDescription(schema as z.ZodArray, depth + 1);
    case 'union':
      return getUnionDescription(schema as z.ZodUnion);
    case 'enum':
      return getEnumDescription(schema as z.ZodEnum);
    case 'literal':
      return getLiteralDescription(schema as z.ZodLiteral);
    default:
      return def.type;
  }
}

export function getArrayDescription(arraySchema: z.ZodArray, depth: number = 0): string {
  const elementType = getZodTypeName(arraySchema.element as z.ZodType);
  if (elementType === 'array') {
    if (depth > 10) {
      return 'array[][]';
    }
    return getArrayDescription(arraySchema.element as z.ZodArray, depth + 1);
  }
  return `${elementType}[]`;
}

export function getUnionDescription(unionSchema: z.ZodUnion): string {
  // Check if all union members are arrays - if so, treat as array type
  const optionsTypes = unionSchema.options.map((option) => getZodTypeName(option as z.ZodType));
  if (new Set(optionsTypes).size === 1) {
    return optionsTypes[0];
  }
  return `(${optionsTypes.join(' | ')})`;
}

export function getEnumDescription(schema: z.ZodEnum): string {
  return schema.options.map((o) => `"${o}"`).join(' | ');
}

export function getLiteralDescription(schema: z.ZodLiteral): string {
  const literalValue = schema.value;
  return typeof literalValue === 'string' ? `"${literalValue}"` : String(literalValue);
}
