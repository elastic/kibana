/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAtPointer, refToPointer } from '../openapi/json_pointer';
import type { SchemaNode } from '../openapi/schema_walk';
import { isRecord } from '../openapi/schema_walk';
import type { OpenApiDocument } from '../openapi/types';

// Beyond SHALLOW_DEPTH only required properties and `minItems` items are generated, which
// keeps samples of large recursive schemas small; MAX_DEPTH stops cycles of required refs.
const SHALLOW_DEPTH = 6;
const MAX_DEPTH = 32;

const FORMAT_PLACEHOLDERS: Readonly<Record<string, string>> = {
  'date-time': '2026-01-01T00:00:00Z',
  date: '2026-01-01',
  time: '00:00:00Z',
  email: 'user@example.com',
  hostname: 'example.com',
  uri: 'https://example.com/',
  url: 'https://example.com/',
  uuid: '00000000-0000-4000-8000-000000000000',
  ipv4: '192.0.2.1',
  ipv6: '2001:db8::1',
  byte: 'AA==',
};

const numberOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

const placeholderString = ({ format, minLength, maxLength }: SchemaNode): string => {
  const formatted = typeof format === 'string' ? FORMAT_PLACEHOLDERS[format] : undefined;
  if (formatted) {
    return formatted;
  }
  const value = 'string'.padEnd(numberOrUndefined(minLength) ?? 0, 'x');
  return value.slice(0, numberOrUndefined(maxLength) ?? value.length);
};

const placeholderNumber = (schema: SchemaNode, integer: boolean): number => {
  const step = integer ? 1 : 0.5;
  const exclusiveMinimum = numberOrUndefined(schema.exclusiveMinimum);
  const exclusiveMaximum = numberOrUndefined(schema.exclusiveMaximum);
  const lower =
    numberOrUndefined(schema.minimum) ??
    (exclusiveMinimum === undefined ? undefined : exclusiveMinimum + step);
  const upper =
    numberOrUndefined(schema.maximum) ??
    (exclusiveMaximum === undefined ? undefined : exclusiveMaximum - step);
  const value = lower ?? (upper !== undefined && upper < 0 ? upper : 0);
  return integer ? Math.ceil(value) : value;
};

const firstType = ({ type, properties, items }: SchemaNode): unknown => {
  if (Array.isArray(type)) {
    return type.find((candidate) => candidate !== 'null') ?? 'null';
  }
  return type ?? (properties ? 'object' : items ? 'array' : undefined);
};

const allowsNull = ({ type, nullable }: SchemaNode): boolean =>
  nullable === true || type === 'null' || (Array.isArray(type) && type.includes('null'));

const resolve = (schema: unknown, document: OpenApiDocument): SchemaNode => {
  const resolved =
    isRecord(schema) && typeof schema.$ref === 'string'
      ? getAtPointer(document, refToPointer(schema.$ref))
      : schema;
  return isRecord(resolved) ? resolved : {};
};

const mergeProperties = (left: unknown, right: unknown): SchemaNode | undefined => {
  if (!isRecord(left) || !isRecord(right)) {
    return isRecord(left) ? left : isRecord(right) ? right : undefined;
  }
  const merged: SchemaNode = { ...left };
  for (const [name, property] of Object.entries(right)) {
    merged[name] = name in merged ? { allOf: [merged[name], property] } : property;
  }
  return merged;
};

// Merges allOf parts into one schema before sampling, so that a property declared by several
// parts gets the constraints of all of them (e.g. an `enum` in one and a plain `type` in another).
const mergeAllOf = (parts: readonly unknown[], document: OpenApiDocument): SchemaNode =>
  parts.reduce<SchemaNode>((merged, part) => {
    const { allOf, ...schema } = resolve(part, document);
    const next = Array.isArray(allOf) ? { ...mergeAllOf(allOf, document), ...schema } : schema;
    const result: SchemaNode = { ...next, ...merged };
    const properties = mergeProperties(merged.properties, next.properties);
    if (properties) {
      result.properties = properties;
    }
    const required = [merged.required, next.required].flatMap((value) =>
      Array.isArray(value) ? value : []
    );
    if (required.length > 0) {
      result.required = [...new Set(required)];
    }
    return result;
  }, {});

/**
 * Builds a deterministic value for a schema: the first of `examples`, `default`, `const` and
 * `enum` that it declares, otherwise a placeholder for its type and format.
 */
export const sampleSchema = (schema: unknown, document: OpenApiDocument, depth = 0): unknown => {
  if (!isRecord(schema) || depth > MAX_DEPTH) {
    return null;
  }
  if (typeof schema.$ref === 'string') {
    return sampleSchema(resolve(schema, document), document, depth + 1);
  }
  if (Array.isArray(schema.examples) && schema.examples.length > 0) {
    return schema.examples[0];
  }
  for (const keyword of ['example', 'default', 'const'] as const) {
    if (schema[keyword] !== undefined) {
      return schema[keyword];
    }
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }
  const sampleNext = (child: unknown) => sampleSchema(child, document, depth + 1);

  const variants = Array.isArray(schema.oneOf) ? schema.oneOf : schema.anyOf;
  if (Array.isArray(variants) && variants.length > 0) {
    const nonNull = variants.find((variant) => !isRecord(variant) || variant.type !== 'null');
    return sampleNext(nonNull ?? variants[0]);
  }
  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const { allOf, ...rest } = schema;
    return sampleSchema(mergeAllOf([rest, ...allOf], document), document, depth + 1);
  }

  switch (firstType(schema)) {
    case 'object': {
      const required = new Set(Array.isArray(schema.required) ? schema.required : []);
      const properties = isRecord(schema.properties) ? schema.properties : {};
      const sampled = Object.entries(properties).flatMap(([name, property]) => {
        if (depth >= SHALLOW_DEPTH && !required.has(name)) {
          return [];
        }
        const value = sampleNext(property);
        return value === null && isRecord(property) && !allowsNull(property) ? [] : [[name, value]];
      });
      return Object.fromEntries(sampled);
    }
    case 'array': {
      const minItems = numberOrUndefined(schema.minItems) ?? 0;
      const count = depth >= SHALLOW_DEPTH ? minItems : Math.max(minItems, 1);
      if (Array.isArray(schema.items)) {
        return schema.items.map(sampleNext);
      }
      return Array.from({ length: count }, () => sampleNext(schema.items));
    }
    case 'string':
      return placeholderString(schema);
    case 'integer':
      return placeholderNumber(schema, true);
    case 'number':
      return placeholderNumber(schema, false);
    case 'boolean':
      return true;
    case 'null':
      return null;
    default:
      return {};
  }
};
