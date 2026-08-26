/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodType } from '@kbn/zod/v4';
import { isZod, z } from '@kbn/zod/v4';
import { getZodSchemaType as getSchemaType, type ZodTypeKind } from '../zod/get_zod_schema_type';

export interface ExtractedSchemaPropertyPath {
  path: string;
  type: ZodTypeKind;
  description?: string;
  displayType?: string;
}

export interface ExtractSchemaPropertyPathsOptions {
  /**
   * When true, each entry includes `description` (from Zod `.describe()`) and `displayType`
   */
  includeMetadata?: boolean;
}

function getZodDescription(schema: ZodType): string | undefined {
  const s = schema as unknown as {
    description?: string;
    unwrap?: () => ZodType;
    innerType?: ZodType;
  };
  if (typeof s.description === 'string') return s.description;
  const inner = s.unwrap?.() ?? s.innerType;
  if (inner) return getZodDescription(inner);
  return undefined;
}

function unwrapOptionalNullable(schema: ZodType): ZodType {
  let current: ZodType = schema;
  let def = current.def as { type?: string } | undefined;
  while (def?.type === 'optional' || def?.type === 'nullable') {
    current = (current as z.ZodOptional<ZodType>).unwrap();
    def = current.def as { type?: string } | undefined;
  }
  return current;
}

function getJsonSchemaTypeLabel(schema: ZodType): string {
  const unwrapped = unwrapOptionalNullable(schema);
  try {
    const json = z.toJSONSchema(unwrapped) as Record<string, unknown>;
    if (json.type === 'object' && json.properties) return 'object';
    if (typeof json.type === 'string') return json.type;
    if (Array.isArray(json.type)) return (json.type as string[]).join(' | ');
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function getPrimitiveArrayDisplayType(elementType: ZodType): string {
  const label = getJsonSchemaTypeLabel(elementType);
  if (label === 'object') return 'array';
  if (label === 'unknown') return 'array';
  if (label.includes(' | ')) return `(${label})[]`;
  return `${label}[]`;
}

function getMetadataDisplayType(schema: ZodType): string {
  const core = unwrapOptionalNullable(schema);
  if (core instanceof z.ZodArray) {
    const el = core.element as ZodType;
    if (el instanceof z.ZodObject && Object.keys(el.shape).length > 0) {
      return 'object';
    }
    return getPrimitiveArrayDisplayType(el);
  }
  if (core instanceof z.ZodObject) {
    return 'object';
  }
  return getJsonSchemaTypeLabel(schema);
}

function attachMetadata(
  entry: ExtractedSchemaPropertyPath,
  valueSchema: ZodType,
  options?: ExtractSchemaPropertyPathsOptions
): void {
  if (!options?.includeMetadata) {
    return;
  }
  const desc = getZodDescription(valueSchema);
  if (desc !== undefined) {
    entry.description = desc;
  }
  entry.displayType = getMetadataDisplayType(valueSchema);
}

function extractSchemaPropertyPathsRecursive(
  zodSchema: ZodType,
  prefix = '',
  options?: ExtractSchemaPropertyPathsOptions
): ExtractedSchemaPropertyPath[] {
  const paths: ExtractedSchemaPropertyPath[] = [];

  if (!zodSchema || typeof zodSchema !== 'object') {
    return paths;
  }

  // Handle ZodObject
  if (zodSchema instanceof z.ZodObject) {
    const shape = zodSchema.shape;
    for (const [key, value] of Object.entries(shape)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      const valueSchema = value as ZodType;
      const type = getSchemaType(valueSchema);

      const entry: ExtractedSchemaPropertyPath = {
        path: currentPath,
        type,
      };
      attachMetadata(entry, valueSchema, options);
      paths.push(entry);

      // Recursively extract nested paths
      const nestedPaths = extractSchemaPropertyPathsRecursive(valueSchema, currentPath, options);
      paths.push(...nestedPaths);
    }
  }

  // Handle ZodRecord (for dynamic keys like steps)
  else if (zodSchema.def && zodSchema.def.type === 'record') {
    const valueType = (zodSchema as z.ZodRecord).valueType as ZodType;
    if (valueType) {
      // For records, we can't know the exact keys, but we can extract the value structure
      const nestedPaths = extractSchemaPropertyPathsRecursive(valueType, prefix, options);
      paths.push(...nestedPaths);
    }
  }

  // Handle ZodOptional and ZodNullable
  else if (
    zodSchema.def &&
    (zodSchema.def.type === 'optional' || zodSchema.def.type === 'nullable')
  ) {
    const innerType = (zodSchema as z.ZodOptional<ZodType>).unwrap();
    const nestedPaths = extractSchemaPropertyPathsRecursive(innerType, prefix, options);
    paths.push(...nestedPaths);
  }

  // Handle ZodArray: allow KQL like `event.items.id` when items is z.array(z.object({ id: ... })) —
  // same dot notation used for array-of-object fields in trigger conditions.
  else if (zodSchema instanceof z.ZodArray) {
    const elementType = zodSchema.element as ZodType;
    const nestedPaths = extractSchemaPropertyPathsRecursive(elementType, prefix, options);
    paths.push(...nestedPaths);
    return paths;
  }

  return paths;
}

export function extractSchemaPropertyPaths(
  zodSchema: unknown,
  options?: ExtractSchemaPropertyPathsOptions
): ExtractedSchemaPropertyPath[] {
  if (isZod(zodSchema)) {
    return extractSchemaPropertyPathsRecursive(zodSchema as ZodType, '', options);
  }
  return [];
}
