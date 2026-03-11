/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromKueryExpression, getKqlFieldNames } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { isZod } from '@kbn/zod';
import type { z } from '@kbn/zod/v4';
import { extractSchemaPropertyPaths } from '../extract_schema_property_paths/extract_schema_property_paths';

export type ValidateKqlAgainstSchemaResult = { valid: true } | { valid: false; error: string };

function normalizeFieldPath(field: string | null | undefined): string {
  if (field === null || field === undefined) {
    return '';
  }
  return String(field).trim();
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
 * @param options - Optional settings; use fieldPrefix when KQL uses a root (e.g. "event." for "event.severity").
 * @returns { valid: true } or { valid: false, error: string }.
 *
 * @example
 * ```ts
 * const eventSchema = z.object({ severity: z.string(), message: z.string() });
 * validateKqlAgainstSchema('event.severity: "high"', eventSchema, { fieldPrefix: 'event.' });
 * // { valid: true }
 *
 * validateKqlAgainstSchema('event.unknown: "x"', eventSchema, { fieldPrefix: 'event.' });
 * // { valid: false, error: "KQL references field 'event.unknown' which is not part of event.* properties." }
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

  let ast: ReturnType<typeof fromKueryExpression>;
  try {
    ast = fromKueryExpression(trimmed);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { valid: false, error: message };
  }

  if (!isZod(schema)) {
    return {
      valid: false,
      error: i18n.translate('workflows.validateKql.schemaMustBeZod', {
        defaultMessage: 'Schema must be a Zod schema.',
      }),
    };
  }

  const schemaPathEntries = extractSchemaPropertyPaths(schema);
  const allowedSet = new Set<string>();

  if (fieldPrefix) {
    allowedSet.add(fieldPrefix);
    if (fieldPrefix.endsWith('.')) {
      allowedSet.add(fieldPrefix.slice(0, -1));
    }
  }
  for (const { path } of schemaPathEntries) {
    const fullPath = fieldPrefix ? `${fieldPrefix}${path}` : path;
    allowedSet.add(fullPath);
  }

  const kqlFieldPaths = getKqlFieldNames(ast);
  const normalizedFields = kqlFieldPaths.map(normalizeFieldPath).filter(Boolean);

  for (const field of normalizedFields) {
    const isWildcard = field.endsWith('.*');
    const pathToCheck = isWildcard ? field.slice(0, -2) : field;

    if (!allowedSet.has(pathToCheck)) {
      return {
        valid: false,
        error: fieldPrefix
          ? i18n.translate('workflows.validateKql.fieldNotInSchemaWithPrefix', {
              defaultMessage:
                'KQL references field "{field}" which is not part of {fieldPrefix}* properties.',
              values: { field, fieldPrefix },
            })
          : i18n.translate('workflows.validateKql.fieldNotInSchema', {
              defaultMessage: 'KQL references field "{field}" which is not part of the properties.',
              values: { field },
            }),
      };
    }
  }

  return { valid: true };
}
