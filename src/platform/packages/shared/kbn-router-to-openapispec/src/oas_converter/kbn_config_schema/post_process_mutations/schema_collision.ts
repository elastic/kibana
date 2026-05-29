/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metaFields } from '@kbn/config-schema';
import type { OpenAPIV3 } from 'openapi-types';

const ISSUE_URL = 'https://github.com/elastic/kibana/issues/271809';

const { META_FIELD_X_OAS_OPTIONAL } = metaFields;

/**
 * Internal annotations the OAS converter writes onto schemas mid-parse and
 * strips at the end of {@link parse}. Ignored when comparing two registrations
 * of the same shared schema id: the existing entry in the master map has
 * already been stripped, but a freshly generated entry from a `maybe(shared)`
 * site still has them attached at registration time.
 */
const TRANSIENT_KEYS = new Set<string>([META_FIELD_X_OAS_OPTIONAL]);

const visibleKeys = (value: object): string[] => {
  return Object.keys(value).filter((key) => !TRANSIENT_KEYS.has(key));
};

/**
 * Deep-equality that ignores transient internal annotations on schema objects
 * (see {@link TRANSIENT_KEYS}). Drop-in replacement for `lodash.isEqual` for
 * the shared-schema comparison, scoped to plain JSON-shaped values.
 */
export const schemasMatch = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!schemasMatch(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;

  const aKeys = visibleKeys(a as object);
  const bKeys = visibleKeys(b as object);
  if (aKeys.length !== bKeys.length) return false;

  const bRecord = b as Record<string, unknown>;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bRecord, key)) return false;
    if (!schemasMatch((a as Record<string, unknown>)[key], bRecord[key])) return false;
  }
  return true;
};

const propertyNames = (schema: OpenAPIV3.SchemaObject): string[] => {
  return schema.properties ? Object.keys(schema.properties).sort() : [];
};

const sortedDifference = (a: readonly string[], b: readonly string[]): string[] => {
  const bSet = new Set(b);
  return a.filter((key) => !bSet.has(key));
};

const formatKeyList = (keys: readonly string[]): string => {
  if (keys.length === 0) return '(none)';
  return keys.map((key) => `\`${key}\``).join(', ');
};

/**
 * Build the human-readable diagnostic for a shared-schema id collision.
 *
 * Two shapes are considered colliding when they share an id but differ
 * in any way (deep-equal mismatch). The diagnostic lists property-key
 * differences first because that is the dominant failure mode driven by
 * `Base.extends({...})` patterns inheriting `meta.id` from the base.
 */
export const describeSchemaCollision = (
  id: string,
  previous: OpenAPIV3.SchemaObject,
  next: OpenAPIV3.SchemaObject
): string => {
  const previousKeys = propertyNames(previous);
  const nextKeys = propertyNames(next);
  const onlyInPrevious = sortedDifference(previousKeys, nextKeys);
  const onlyInNext = sortedDifference(nextKeys, previousKeys);

  const lines = [
    `OAS shared schema collision for id "${id}": the same id was registered with two different shapes.`,
  ];

  if (onlyInPrevious.length > 0 || onlyInNext.length > 0) {
    lines.push(
      `  properties only in the first registration: ${formatKeyList(onlyInPrevious)}`,
      `  properties only in the second registration: ${formatKeyList(onlyInNext)}`
    );
  } else {
    lines.push('  property key sets match; the shapes differ in property definitions or metadata.');
  }

  lines.push(
    'This usually means a `Base.extends({...})` call inherited `meta.id` from its base, ' +
      'or two unrelated schemas accidentally chose the same id string. ' +
      "Pass `{ meta: { id: 'distinct_id' } }` as the second argument to `extends()` " +
      `to give the derived schema its own component name. See ${ISSUE_URL}.`
  );

  return lines.join('\n');
};

/**
 * Thrown by the OAS converter when a shared schema id is registered with two
 * different shapes within a single generation pass.
 */
export class OasSchemaCollisionError extends Error {
  public readonly schemaId: string;
  constructor(message: string, schemaId: string) {
    super(message);
    this.name = 'OasSchemaCollisionError';
    this.schemaId = schemaId;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
