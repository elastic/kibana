/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type ZodFirstPartyTypeKind =
  | 'ZodString'
  | 'ZodNumber'
  | 'ZodBoolean'
  | 'ZodArray'
  | 'ZodObject'
  | 'ZodRecord'
  | 'ZodOptional'
  | 'ZodNullable'
  | 'ZodUnknown';

export interface ExtractedSchemaPropertyPath {
  path: string;
  type: ZodFirstPartyTypeKind;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSchemaType(schema: any): ZodFirstPartyTypeKind {
  if (!schema || !schema._def) {
    return 'ZodUnknown';
  }

  return schema._def.typeName;
}

function extractSchemaPropertyPathsRecursive(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zodSchema: any,
  prefix = ''
): ExtractedSchemaPropertyPath[] {
  const paths: ExtractedSchemaPropertyPath[] = [];

  if (!zodSchema || typeof zodSchema !== 'object') {
    return paths;
  }

  // Handle ZodObject
  if (zodSchema._def && zodSchema._def.typeName === 'ZodObject') {
    const shape = zodSchema._def.shape();
    for (const [key, value] of Object.entries(shape)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      const type = getSchemaType(value);

      paths.push({
        path: currentPath,
        type,
      });

      // Recursively extract nested paths
      const nestedPaths = extractSchemaPropertyPathsRecursive(value, currentPath);
      paths.push(...nestedPaths);
    }
  }

  // Handle ZodRecord (for dynamic keys like steps)
  else if (zodSchema._def && zodSchema._def.typeName === 'ZodRecord') {
    const valueType = zodSchema._def.valueType;
    if (valueType) {
      // For records, we can't know the exact keys, but we can extract the value structure
      const nestedPaths = extractSchemaPropertyPathsRecursive(valueType, prefix);
      paths.push(...nestedPaths);
    }
  }

  // Handle ZodOptional and ZodNullable
  else if (
    zodSchema._def &&
    (zodSchema._def.typeName === 'ZodOptional' || zodSchema._def.typeName === 'ZodNullable')
  ) {
    const innerType = zodSchema._def.innerType;
    const nestedPaths = extractSchemaPropertyPathsRecursive(innerType, prefix);
    paths.push(...nestedPaths);
  }

  // Handle ZodArray
  else if (zodSchema._def && zodSchema._def.typeName === 'ZodArray') {
    // Arrays don't add to property paths in our context
    return paths;
  }

  return paths;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractSchemaPropertyPaths(zodSchema: any): ExtractedSchemaPropertyPath[] {
  return extractSchemaPropertyPathsRecursive(zodSchema);
}
