/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRecord } from '../is_record';

const REF_PREFIX = '#/components/schemas/';

const refComponentName = (schema: Record<string, unknown>): string | undefined => {
  const ref = schema.$ref;
  return typeof ref === 'string' && ref.startsWith(REF_PREFIX)
    ? ref.slice(REF_PREFIX.length)
    : undefined;
};

const compositionBranches = (schema: Record<string, unknown>): unknown[] =>
  (['allOf', 'oneOf', 'anyOf'] as const).flatMap((key) =>
    Array.isArray(schema[key]) ? (schema[key] as unknown[]) : []
  );

const propertyValues = (schema: Record<string, unknown>): unknown[] =>
  isRecord(schema.properties) ? Object.values(schema.properties) : [];

const arrayItems = (schema: Record<string, unknown>): unknown[] =>
  schema.items === undefined ? [] : [schema.items];

const additionalPropertiesSchema = (schema: Record<string, unknown>): unknown[] =>
  isRecord(schema.additionalProperties) ? [schema.additionalProperties] : [];

const childSchemas = (schema: Record<string, unknown>): unknown[] => [
  ...compositionBranches(schema),
  ...propertyValues(schema),
  ...arrayItems(schema),
  ...additionalPropertiesSchema(schema),
];

export const collectReachableComponents = (
  schema: unknown,
  seen: Set<string>,
  out: Set<string>,
  componentSchemas: Record<string, unknown>
): void => {
  if (!isRecord(schema)) return;

  const name = refComponentName(schema);
  if (name !== undefined) {
    if (seen.has(name)) return;
    seen.add(name);
    out.add(name);
    collectReachableComponents(componentSchemas[name], seen, out, componentSchemas);
    return;
  }

  childSchemas(schema).forEach((child) =>
    collectReachableComponents(child, seen, out, componentSchemas)
  );
};
