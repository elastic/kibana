/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IHttpOperation } from '@stoplight/types';
import type { LocatedSchema } from './types';

export type SchemaNode = Record<string, unknown>;

export const isRecord = (value: unknown): value is SchemaNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const BUNDLE_REF = /^#\/__bundled__\/(.+)$/;

/** Returns the bundle component name a `$ref` points at, or undefined for other refs. */
export const getBundleRefName = (ref: unknown): string | undefined => {
  const match = typeof ref === 'string' ? BUNDLE_REF.exec(ref) : null;
  return match ? decodeURIComponent(match[1]).replace(/~1/g, '/').replace(/~0/g, '~') : undefined;
};

const SUBSCHEMA_KEYWORDS = [
  'additionalItems',
  'additionalProperties',
  'contains',
  'else',
  'if',
  'items',
  'not',
  'propertyNames',
  'then',
  'unevaluatedItems',
  'unevaluatedProperties',
  'allOf',
  'anyOf',
  'oneOf',
  'prefixItems',
] as const;

const SUBSCHEMA_MAP_KEYWORDS = [
  '$defs',
  'definitions',
  'dependentSchemas',
  'patternProperties',
  'properties',
] as const;

/**
 * Visits a schema and every nested subschema once. Only schema keywords are followed, so
 * `example`, `default`, `enum` and `const` values are never visited.
 */
export const walkSchema = (
  root: unknown,
  visit: (schema: SchemaNode) => void,
  seen: WeakSet<object> = new WeakSet()
): void => {
  if (!isRecord(root) || seen.has(root)) {
    return;
  }
  seen.add(root);
  visit(root);
  for (const keyword of SUBSCHEMA_KEYWORDS) {
    const value = root[keyword];
    for (const child of Array.isArray(value) ? value : [value]) {
      walkSchema(child, visit, seen);
    }
  }
  for (const keyword of SUBSCHEMA_MAP_KEYWORDS) {
    const value = root[keyword];
    if (isRecord(value)) {
      for (const child of Object.values(value)) {
        walkSchema(child, visit, seen);
      }
    }
  }
};

/** Lists the parameter, body and response schemas of an operation. */
export const getOperationSchemas = ({ request, responses }: IHttpOperation): LocatedSchema[] => {
  const located: LocatedSchema[] = [];
  for (const group of ['path', 'query', 'headers', 'cookie'] as const) {
    for (const { name, schema } of request?.[group] ?? []) {
      if (schema) {
        located.push({ kind: 'parameter', location: `${group}.${name}`, schema });
      }
    }
  }
  for (const { mediaType, schema } of request?.body?.contents ?? []) {
    if (schema) {
      located.push({ kind: 'request', location: `request body ${mediaType}`, schema });
    }
  }
  for (const { code, contents, headers } of responses) {
    for (const { mediaType, schema } of contents ?? []) {
      if (schema) {
        located.push({ kind: 'response', location: `response ${code} ${mediaType}`, schema });
      }
    }
    for (const { name, schema } of headers ?? []) {
      if (schema) {
        located.push({ kind: 'response', location: `response ${code} header ${name}`, schema });
      }
    }
  }
  return located;
};

/** Formats an operation as `METHOD /path` for error messages. */
export const describeOperation = ({ method, path }: IHttpOperation): string =>
  `${method.toUpperCase()} ${path}`;
