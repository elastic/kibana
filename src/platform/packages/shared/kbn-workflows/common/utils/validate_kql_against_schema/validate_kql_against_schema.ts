/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromKueryExpression, getKqlFieldNamesFromExpression } from '@kbn/es-query';
import { isZod } from '@kbn/zod';
import type { z } from '@kbn/zod/v4';
import { extractSchemaPropertyPaths } from '../extract_schema_property_paths/extract_schema_property_paths';

export interface ValidateKqlAgainstSchemaResult {
  valid: boolean;
  error?: string;
}

export interface ValidateKqlAgainstSchemaOptions {
  /**
   * Prefix for schema-derived field paths (e.g. "event" for trigger conditions using event.severity).
   * When set, allowed paths are prefix, prefix.path1, prefix.path2, ...
   * When omitted, allowed paths are the schema paths as-is.
   */
  fieldPrefix?: string;
}

/**
 * Validates a KQL string in two ways:
 * 1. Ensures the string is valid KQL (parseable syntax).
 * 2. Ensures every field referenced in the KQL is a property path allowed by the schema.
 *
 * @param kql - The KQL string to validate (e.g. a trigger condition like `event.severity == "high"`).
 * @param schema - A Zod schema describing allowed properties (e.g. event payload schema).
 * @param options - Optional settings; use fieldPrefix when KQL uses a root like "event" (e.g. "event.severity").
 * @returns { valid: true } or { valid: false, error: string }.
 *
 * @example
 * ```ts
 * const eventSchema = z.object({ severity: z.string(), message: z.string() });
 * validateKqlAgainstSchema('event.severity: "high"', eventSchema, { fieldPrefix: 'event' });
 * // { valid: true }
 *
 * validateKqlAgainstSchema('event.unknown: "x"', eventSchema, { fieldPrefix: 'event' });
 * // { valid: false, error: "KQL references field 'event.unknown' which is not in the schema." }
 *
 * validateKqlAgainstSchema('invalid (', eventSchema);
 * // { valid: false, error: "<parse error message>" }
 * ```
 */
export function validateKqlAgainstSchema(
  kql: string,
  schema: z.ZodType,
  options: ValidateKqlAgainstSchemaOptions = {}
): ValidateKqlAgainstSchemaResult {
  const { fieldPrefix = '' } = options;

  const trimmed = typeof kql === 'string' ? kql.trim() : '';
  if (trimmed === '') {
    return { valid: true };
  }

  let kqlFieldPaths: string[];
  try {
    fromKueryExpression(trimmed);
    kqlFieldPaths = getKqlFieldNamesFromExpression(trimmed);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { valid: false, error: message };
  }

  if (!isZod(schema)) {
    return { valid: false, error: 'Schema must be a Zod schema.' };
  }

  const schemaPaths = extractSchemaPropertyPaths(schema).map((p) => p.path);
  const allowedSet = new Set<string>();

  if (fieldPrefix) {
    allowedSet.add(fieldPrefix);
    for (const path of schemaPaths) {
      allowedSet.add(`${fieldPrefix}.${path}`);
    }
  } else {
    for (const path of schemaPaths) {
      allowedSet.add(path);
    }
  }

  const normalizedFields = kqlFieldPaths
    .map((field) => (field === null || field === undefined ? '' : String(field).trim()))
    .filter(Boolean);

  for (const field of normalizedFields) {
    const isWildcard = field.endsWith('.*');
    const pathToCheck = isWildcard ? field.slice(0, -2) : field;

    if (!allowedSet.has(pathToCheck)) {
      return {
        valid: false,
        error: `KQL references field '${field}' which is not in the schema.`,
      };
    }
  }

  return { valid: true };
}
