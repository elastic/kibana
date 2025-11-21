/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isZod } from '@kbn/zod';
import type { ZodType } from '@kbn/zod/v4';
import { z } from '@kbn/zod/v4';

type ZodTypeKind =
  | 'string'
  | 'number'
  | 'int'
  | 'boolean'
  | 'bigint'
  | 'symbol'
  | 'null'
  | 'undefined'
  | 'void'
  | 'never'
  | 'any'
  | 'unknown'
  | 'date'
  | 'object'
  | 'record'
  | 'file'
  | 'array'
  | 'tuple'
  | 'union'
  | 'intersection'
  | 'map'
  | 'set'
  | 'enum'
  | 'literal'
  | 'nullable'
  | 'optional'
  | 'nonoptional'
  | 'success'
  | 'transform'
  | 'default'
  | 'prefault'
  | 'catch'
  | 'nan'
  | 'pipe'
  | 'readonly'
  | 'template_literal'
  | 'promise'
  | 'lazy'
  | 'custom';

export interface ExtractedSchemaPropertyPath {
  path: string;
  type: ZodTypeKind;
}

function getSchemaType(schema: ZodType): ZodTypeKind {
  if (!schema || !schema.def) {
    return 'unknown';
  }

  return schema.def.type;
}

function extractSchemaPropertyPathsRecursive(
  zodSchema: ZodType,
  prefix = ''
): ExtractedSchemaPropertyPath[] {
  const paths: ExtractedSchemaPropertyPath[] = [];

  if (!zodSchema || typeof zodSchema !== 'object') {
    return paths;
  }

  // Handle ZodObject
  if (zodSchema instanceof z.ZodObject) {
    const shape = zodSchema.def.shape;
    for (const [key, value] of Object.entries(shape)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      const type = getSchemaType(value as ZodType);

      paths.push({
        path: currentPath,
        type,
      });

      // Recursively extract nested paths
      const nestedPaths = extractSchemaPropertyPathsRecursive(value as ZodType, currentPath);
      paths.push(...nestedPaths);
    }
  }

  // Handle ZodRecord (for dynamic keys like steps)
  else if (zodSchema.def && zodSchema.def.type === 'record') {
    const valueType = (zodSchema as z.ZodRecord).valueType as ZodType;
    if (valueType) {
      // For records, we can't know the exact keys, but we can extract the value structure
      const nestedPaths = extractSchemaPropertyPathsRecursive(valueType, prefix);
      paths.push(...nestedPaths);
    }
  }

  // Handle ZodOptional and ZodNullable
  else if (
    zodSchema.def &&
    (zodSchema.def.type === 'optional' || zodSchema.def.type === 'nullable')
  ) {
    const innerType = (zodSchema as z.ZodOptional<z.ZodType>).unwrap();
    const nestedPaths = extractSchemaPropertyPathsRecursive(innerType, prefix);
    paths.push(...nestedPaths);
  }

  // Handle ZodArray
  else if (zodSchema.def && zodSchema.def.type === 'array') {
    // Arrays don't add to property paths in our context
    return paths;
  }

  return paths;
}

export function extractSchemaPropertyPaths(zodSchema: unknown): ExtractedSchemaPropertyPath[] {
  if (isZod(zodSchema)) {
    return extractSchemaPropertyPathsRecursive(zodSchema as ZodType);
  }
  return [];
}
