/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractOperation, LocatedSchema } from './types';

export type SchemaNode = Record<string, unknown>;

export const isRecord = (value: unknown): value is SchemaNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
  'dependencies',
  'dependentSchemas',
  'patternProperties',
  'properties',
] as const;

export interface WalkOptions {
  readonly seen?: WeakSet<object>;
  /** Returns the target of a `$ref`, so the walk continues into referenced schemas. */
  readonly resolveRef?: (ref: string) => unknown;
}

/**
 * Visits a schema and every nested subschema once. Only schema keywords are followed, so
 * `example`, `default`, `enum` and `const` values are never visited.
 */
export const walkSchema = (
  root: unknown,
  visit: (schema: SchemaNode) => void,
  { seen = new WeakSet(), resolveRef }: WalkOptions = {}
): void => {
  if (!isRecord(root) || seen.has(root)) {
    return;
  }
  seen.add(root);
  visit(root);
  const options = { seen, resolveRef };
  if (resolveRef && typeof root.$ref === 'string') {
    walkSchema(resolveRef(root.$ref), visit, options);
  }
  for (const keyword of SUBSCHEMA_KEYWORDS) {
    const value = root[keyword];
    for (const child of Array.isArray(value) ? value : [value]) {
      walkSchema(child, visit, options);
    }
  }
  for (const keyword of SUBSCHEMA_MAP_KEYWORDS) {
    const value = root[keyword];
    if (isRecord(value)) {
      for (const child of Object.values(value)) {
        walkSchema(child, visit, options);
      }
    }
  }
};

/** Formats an operation as `METHOD /path` for error messages. */
export const describeOperation = ({ method, path }: ContractOperation): string =>
  `${method.toUpperCase()} ${path}`;

/** Lists the parameter, body and response schemas of an operation. */
export const getOperationSchemas = ({
  parameters,
  requestBody,
  responses,
}: ContractOperation): LocatedSchema[] => [
  ...parameters.flatMap(({ in: location, name, schema }) =>
    schema ? [{ kind: 'parameter' as const, location: `${location}.${name}`, schema }] : []
  ),
  ...(requestBody?.contents ?? []).flatMap(({ mediaType, schema }) =>
    schema ? [{ kind: 'request' as const, location: `request body ${mediaType}`, schema }] : []
  ),
  ...responses.flatMap(({ code, contents, headers }) => [
    ...contents.flatMap(({ mediaType, schema }) =>
      schema
        ? [{ kind: 'response' as const, location: `response ${code} ${mediaType}`, schema }]
        : []
    ),
    ...headers.flatMap(({ name, schema }) =>
      schema
        ? [{ kind: 'response' as const, location: `response ${code} header ${name}`, schema }]
        : []
    ),
  ]),
];
