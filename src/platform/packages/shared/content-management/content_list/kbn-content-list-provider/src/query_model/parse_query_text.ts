/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Query } from '@elastic/eui';
import type {
  ContentListQueryModel,
  QueryFilterValue,
  FieldDefinition,
  FlagDefinition,
} from './types';
import { EMPTY_MODEL } from './types';

/** Coerce a value (possibly an array) into a string array. */
const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return value != null ? [String(value)] : [];
};

/** Build an EUI schema from field definitions. */
export const buildSchema = (
  fields: ReadonlyArray<FieldDefinition>
): { strict: false; fields: Record<string, { type: 'string' }> } | undefined => {
  if (fields.length === 0) {
    return undefined;
  }
  const schemaFields: Record<string, { type: 'string' }> = {};
  for (const f of fields) {
    schemaFields[f.fieldName] = { type: 'string' };
  }
  return { strict: false, fields: schemaFields };
};

/**
 * Check whether the parsed query AST contains at least one clause for
 * `fieldName` with a non-empty value. This is a structural check — it does
 * not attempt to resolve values, so it works even before the profile store
 * is populated.
 */
const hasFieldClause = (query: InstanceType<typeof Query>, fieldName: string): boolean => {
  const simpleClauses = query.ast.getFieldClauses(fieldName);
  if (simpleClauses?.some((c) => toStringArray(c.value).some((v) => v.length > 0))) {
    return true;
  }
  const includeOr = query.ast.getOrFieldClause(fieldName, undefined, true, 'eq');
  if (includeOr && toStringArray(includeOr.value).some((v) => v.length > 0)) {
    return true;
  }
  const excludeOr = query.ast.getOrFieldClause(fieldName, undefined, false, 'eq');
  return !!excludeOr && toStringArray(excludeOr.value).some((v) => v.length > 0);
};

/** Resolve a display value to IDs: exact match first, then fuzzy fallback. */
const resolveDisplayValue = (displayValue: string, field: FieldDefinition): string[] => {
  const exactId = field.resolveDisplayToId(displayValue);
  if (exactId !== undefined) {
    return [exactId];
  }
  if (field.resolveFuzzyDisplayToIds) {
    return field.resolveFuzzyDisplayToIds(displayValue);
  }
  return [];
};

/** Extract include/exclude IDs for a field from the parsed query. */
const extractFieldFilter = (
  query: InstanceType<typeof Query>,
  field: FieldDefinition
): QueryFilterValue | undefined => {
  const includeIds: string[] = [];
  const excludeIds: string[] = [];

  // Simple field clauses: `field:value` or `-field:value`.
  const simpleClauses = query.ast.getFieldClauses(field.fieldName);
  if (simpleClauses) {
    for (const clause of simpleClauses) {
      const ids = toStringArray(clause.value).flatMap((dv) => resolveDisplayValue(dv, field));
      if (clause.match === 'must') {
        includeIds.push(...ids);
      } else if (clause.match === 'must_not') {
        excludeIds.push(...ids);
      }
    }
  }

  // OR-field clauses: `field:(A or B)`.
  const includeOr = query.ast.getOrFieldClause(field.fieldName, undefined, true, 'eq');
  if (includeOr) {
    includeIds.push(
      ...toStringArray(includeOr.value).flatMap((dv) => resolveDisplayValue(dv, field))
    );
  }
  const excludeOr = query.ast.getOrFieldClause(field.fieldName, undefined, false, 'eq');
  if (excludeOr) {
    excludeIds.push(
      ...toStringArray(excludeOr.value).flatMap((dv) => resolveDisplayValue(dv, field))
    );
  }

  const include = [...new Set(includeIds)];
  const exclude = [...new Set(excludeIds)];

  if (include.length === 0 && exclude.length === 0) {
    return undefined;
  }
  return { include, exclude };
};

/**
 * Extract free-text search by stripping recognised fields and flags from
 * the parsed query and returning the residual text.
 *
 * Uses EUI `Query`'s own clause-removal API so that unrecognised field
 * syntax (e.g. `owner:(alice or bob)`) is preserved verbatim rather than
 * being reconstructed from the AST, which could lose grouping or formatting.
 */
const extractSearchText = (
  query: InstanceType<typeof Query>,
  knownFieldNames: ReadonlySet<string>,
  knownFlagNames: ReadonlySet<string>
): string => {
  let residual = query;

  for (const fieldName of knownFieldNames) {
    residual = residual.removeSimpleFieldClauses(fieldName);
    residual = residual.removeOrFieldClauses(fieldName);
  }

  for (const flagName of knownFlagNames) {
    if (residual.hasIsClause(flagName)) {
      residual = residual.removeIsClause(flagName);
    }
  }

  return residual.text;
};

/** Parse `queryText` into a {@link ContentListQueryModel}. */
export const parseQueryText = (
  queryText: string,
  fields: ReadonlyArray<FieldDefinition>,
  flags: ReadonlyArray<FlagDefinition>,
  schema: ReturnType<typeof buildSchema>
): ContentListQueryModel => {
  if (!queryText.trim()) {
    return { ...EMPTY_MODEL };
  }

  let query: InstanceType<typeof Query>;
  try {
    query = Query.parse(queryText, schema ? { schema } : undefined);
  } catch {
    return { ...EMPTY_MODEL, search: queryText.trim() };
  }

  // Field filters and referenced-field tracking.
  const filters: Record<string, QueryFilterValue> = {};
  const referencedFields = new Set<string>();
  for (const field of fields) {
    if (hasFieldClause(query, field.fieldName)) {
      referencedFields.add(field.fieldName);
    }
    const filter = extractFieldFilter(query, field);
    if (filter) {
      filters[field.fieldName] = filter;
    }
  }

  // Flags (e.g., `is:starred`).
  const parsedFlags: Record<string, boolean> = {};
  for (const flag of flags) {
    if (query.hasIsClause(flag.flagName)) {
      parsedFlags[flag.modelKey] = true;
    }
  }

  // Free-text search.
  const knownFieldNames = new Set(fields.map((f) => f.fieldName));
  const knownFlagNames = new Set(flags.map((f) => f.flagName));
  const search = extractSearchText(query, knownFieldNames, knownFlagNames);

  return { search, filters, flags: parsedFlags, referencedFields };
};
