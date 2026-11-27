/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject, isString, last } from 'lodash';
import {
  AGGREGATION_CONTAINER_KEYS,
  FIELD_PATH_VALUE_KEYS,
  FIELD_PATH_MAP_KEYS,
} from '@kbn/core-saved-objects-api-server-internal';

const NAMESPACE_FIELDS = ['namespace', 'namespaces'];
// the repository does not rewrite `range` keys, so they are only checked here
const FIELD_MAP_KEYS = [...FIELD_PATH_MAP_KEYS, 'range'];

type JsonRecord = Record<string, unknown>;

interface Entry {
  parentKey?: string;
  key: string;
  value: unknown;
}

const isRecord = (value: unknown): value is JsonRecord => isPlainObject(value);

// Every aggregation body in the tree: the values of the `aggs` map and of any nested `aggs` / `aggregations` maps.
const collectAggBodies = (aggs: unknown): JsonRecord[] =>
  isRecord(aggs)
    ? Object.values(aggs)
        .filter(isRecord)
        .flatMap((body) => [
          body,
          ...AGGREGATION_CONTAINER_KEYS.flatMap((key) => collectAggBodies(body[key])),
        ])
    : [];

// Every `key: value` pair in the tree, depth first, with the key of the enclosing object.
const collectEntries = (value: unknown, parentKey?: string): Entry[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectEntries(item, parentKey));
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => [
    { parentKey, key, value: child },
    ...collectEntries(child, key),
  ]);
};

const isFieldValueEntry = ({ key, value }: Entry): boolean =>
  FIELD_PATH_VALUE_KEYS.includes(key) && isString(value);

const isFieldMapEntry = ({ parentKey }: Entry): boolean =>
  parentKey !== undefined && FIELD_MAP_KEYS.includes(parentKey);

const collectFieldPaths = (aggs: unknown): string[] => {
  const entries = collectEntries(aggs);
  return [
    ...entries.filter(isFieldValueEntry).map(({ value }) => value),
    ...entries.filter(isFieldMapEntry).map(({ key }) => key),
  ].filter(isString);
};

const hasTopHits = (body: JsonRecord): boolean => 'top_hits' in body;

// Matches the root namespace fields, bare (`namespaces`) or type-prefixed (`dashboard.namespaces`).
// `{type}.attributes.namespace` is a type's own attribute and stays allowed.
const isNamespaceField = (fieldPath: string): boolean => {
  const segments = fieldPath.split('.');
  return segments.length <= 2 && NAMESPACE_FIELDS.includes(last(segments) ?? '');
};

/**
 * Returns why the given `_find` HTTP aggregations are rejected, or `undefined` when they are allowed.
 * `top_hits` returns raw documents and namespace aggregations expose space ids the
 * user may not be authorized for, so both are blocked on the HTTP API only.
 */
export const getUnsupportedFindAggsReason = (aggs: unknown): string | undefined => {
  if (collectAggBodies(aggs).some(hasTopHits)) {
    return 'Invalid aggregation: top_hits aggregations are not supported by this API';
  }
  const namespaceField = collectFieldPaths(aggs).find(isNamespaceField);
  return namespaceField
    ? `Invalid aggregation: aggregating on [${namespaceField}] is not supported by this API`
    : undefined;
};
