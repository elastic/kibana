/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from 'lodash';

const NESTED_AGGREGATION_KEYS: readonly string[] = ['aggs', 'aggregations'];
const NAMESPACE_FIELDS: readonly string[] = ['namespace', 'namespaces'];
// keys whose string value is a field path, e.g. `terms: { field: 'dashboard.namespaces' }`
const FIELD_VALUE_KEYS: readonly string[] = ['field', 'path'];
// keys whose own keys are field paths, e.g. `range: { 'dashboard.namespaces': { gte: 'a' } }`
const FIELD_MAP_KEYS: readonly string[] = ['term', 'range'];

const isRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

const containsTopHits = (aggs: unknown): boolean =>
  isRecord(aggs) &&
  Object.values(aggs).some(
    (container) =>
      isRecord(container) &&
      ('top_hits' in container ||
        NESTED_AGGREGATION_KEYS.some((key) => containsTopHits(container[key])))
  );

const collectFieldPaths = (value: unknown, parentKey?: string): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectFieldPaths(item, parentKey));
  }
  if (!isRecord(value)) {
    return [];
  }
  const isFieldMap = parentKey !== undefined && FIELD_MAP_KEYS.includes(parentKey);
  return Object.entries(value).flatMap(([key, child]) => [
    ...(isFieldMap ? [key] : []),
    ...(FIELD_VALUE_KEYS.includes(key) && typeof child === 'string' ? [child] : []),
    ...collectFieldPaths(child, key),
  ]);
};

// Matches the root namespace fields, bare (`namespaces`) or type-prefixed (`dashboard.namespaces`).
// `{type}.attributes.namespace` is a type's own attribute and stays allowed.
const isNamespaceField = (fieldPath: string): boolean => {
  const segments = fieldPath.split('.');
  return segments.length <= 2 && NAMESPACE_FIELDS.includes(segments[segments.length - 1]);
};

/**
 * Returns why the given `_find` HTTP aggregations are rejected, or `undefined` when they are allowed.
 * `top_hits` returns raw documents and namespace aggregations expose space ids the
 * user may not be authorized for, so both are blocked on the HTTP API only.
 */
export const getUnsupportedFindAggsReason = (aggs: unknown): string | undefined => {
  if (containsTopHits(aggs)) {
    return 'Invalid aggregation: top_hits aggregations are not supported by this API';
  }
  const namespaceField = collectFieldPaths(aggs).find(isNamespaceField);
  return namespaceField
    ? `Invalid aggregation: aggregating on [${namespaceField}] is not supported by this API`
    : undefined;
};
