/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAtPointer, refToPointer } from './json_pointer';
import type { SchemaNode } from './schema_walk';
import { isRecord } from './schema_walk';
import type { OpenApiDocument } from './types';

const MAX_DEPTH = 16;

const resolveSchema = (schema: unknown, document: OpenApiDocument): SchemaNode => {
  let node = schema;
  for (
    let depth = 0;
    depth < MAX_DEPTH && isRecord(node) && typeof node.$ref === 'string';
    depth++
  ) {
    node = getAtPointer(document, refToPointer(node.$ref));
  }
  return isRecord(node) ? node : {};
};

// A schema together with its allOf/anyOf/oneOf parts, which jointly decide how text is read.
const collectParts = (
  schema: unknown,
  document: OpenApiDocument,
  parts: SchemaNode[] = [],
  depth = 0
): SchemaNode[] => {
  const node = resolveSchema(schema, document);
  parts.push(node);
  for (const keyword of ['allOf', 'anyOf', 'oneOf'] as const) {
    const variants = node[keyword];
    if (Array.isArray(variants) && depth < MAX_DEPTH) {
      variants.forEach((variant) => collectParts(variant, document, parts, depth + 1));
    }
  }
  return parts;
};

/** Returns the JSON types a schema admits, inferring `object`/`array` from their keywords. */
export const getSchemaTypes = (schema: unknown, document: OpenApiDocument): Set<string> => {
  const types = new Set<string>();
  for (const { type, properties, items } of collectParts(schema, document)) {
    for (const name of Array.isArray(type) ? type : [type]) {
      if (typeof name === 'string') {
        types.add(name);
      }
    }
    if (isRecord(properties)) {
      types.add('object');
    }
    if (items !== undefined) {
      types.add('array');
    }
  }
  return types;
};

const findSubschema = (
  schema: unknown,
  document: OpenApiDocument,
  pick: (node: SchemaNode) => unknown
): unknown => collectParts(schema, document).map(pick).find(isRecord);

const matchesPattern = (pattern: string, value: string): boolean => {
  try {
    return new RegExp(pattern, 'u').test(value);
  } catch {
    return true;
  }
};

// Formats that numeric text never satisfies.
const NON_NUMERIC_FORMATS = new Set([
  'date',
  'date-time',
  'time',
  'duration',
  'email',
  'uri',
  'url',
  'uuid',
]);

// Whether a string-typed part takes the (numeric) text, so it stays text instead of a number.
const acceptsAsString = (
  { type, format, pattern, enum: options, const: constant, minLength, maxLength }: SchemaNode,
  value: string
): boolean =>
  (Array.isArray(type) ? type.includes('string') : type === 'string') &&
  (typeof format !== 'string' || !NON_NUMERIC_FORMATS.has(format)) &&
  (typeof pattern !== 'string' || matchesPattern(pattern, value)) &&
  (!Array.isArray(options) || options.includes(value)) &&
  (constant === undefined || constant === value) &&
  (typeof minLength !== 'number' || value.length >= minLength) &&
  (typeof maxLength !== 'number' || value.length <= maxLength);

const coerceText = (value: string, types: Set<string>, parts: SchemaNode[]): unknown => {
  const numeric = types.has('integer') || types.has('number');
  if (types.size === 0 || (types.has('string') && !numeric)) {
    return value;
  }
  if (numeric && value.trim() !== '') {
    const number = Number(value);
    const keepsText = types.has('string') && parts.some((part) => acceptsAsString(part, value));
    if (Number.isFinite(number) && !keepsText) {
      return number;
    }
  }
  if (types.has('string')) {
    return value;
  }
  if (types.has('boolean') && (value === 'true' || value === 'false')) {
    return value === 'true';
  }
  return types.has('null') && value === '' ? null : value;
};

/**
 * Converts the text of a deserialized parameter or form field to the types its schema expects,
 * e.g. `'10'` to `10` for an integer. Text that doesn't parse is left for validation to report.
 */
export const coerceValue = (
  value: unknown,
  schema: unknown,
  document: OpenApiDocument
): unknown => {
  if (Array.isArray(value)) {
    const items = findSubschema(schema, document, (node) => node.items);
    return value.map((item) => coerceValue(item, items, document));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        const property = findSubschema(schema, document, ({ properties }) =>
          isRecord(properties) ? properties[key] : undefined
        );
        return [key, coerceValue(item, property, document)];
      })
    );
  }
  return typeof value === 'string'
    ? coerceText(value, getSchemaTypes(schema, document), collectParts(schema, document))
    : value;
};
