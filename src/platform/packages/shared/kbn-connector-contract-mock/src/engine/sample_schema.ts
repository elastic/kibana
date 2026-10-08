/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendPointer, getAtPointer, refToPointer } from '../openapi/json_pointer';
import type { SchemaNode } from '../openapi/schema_walk';
import { isRecord } from '../openapi/schema_walk';
import type { OpenApiDocument, SpecSchema } from '../openapi/types';
import { samplePattern } from './sample_pattern';

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

const fitLength = (value: string, { minLength, maxLength }: SchemaNode, padding = 'x'): string => {
  const padded = value.padEnd(numberOrUndefined(minLength) ?? 0, padding);
  return padded.slice(0, numberOrUndefined(maxLength) ?? padded.length);
};

const placeholderString = (schema: SchemaNode): string => {
  const { format, pattern } = schema;
  const formatted = typeof format === 'string' ? FORMAT_PLACEHOLDERS[format] : undefined;
  if (formatted) {
    return formatted;
  }
  const sampled = typeof pattern === 'string' ? samplePattern(pattern) : undefined;
  if (typeof pattern !== 'string' || sampled === undefined) {
    return fitLength('string', schema);
  }
  // Repeating the last character extends a trailing `+` or `*`, as in `^[A-Z]{2}-\d+$`.
  const matcher = new RegExp(pattern, 'u');
  const fitted = [sampled.slice(-1) || 'x', 'x']
    .map((padding) => fitLength(sampled, schema, padding))
    .find((value) => matcher.test(value));
  return fitted ?? sampled;
};

const placeholderNumber = (schema: SchemaNode, integer: boolean): number => {
  const step = integer ? 1 : 0.5;
  const exclusiveMinimum = numberOrUndefined(schema.exclusiveMinimum);
  const exclusiveMaximum = numberOrUndefined(schema.exclusiveMaximum);
  const multipleOf = numberOrUndefined(schema.multipleOf);
  const lower =
    numberOrUndefined(schema.minimum) ??
    (exclusiveMinimum === undefined ? undefined : exclusiveMinimum + step);
  const upper =
    numberOrUndefined(schema.maximum) ??
    (exclusiveMaximum === undefined ? undefined : exclusiveMaximum - step);
  const value = lower ?? (upper !== undefined && upper < 0 ? upper : 0);
  const rounded = integer ? Math.ceil(value) : value;
  return multipleOf && multipleOf > 0 ? Math.ceil(rounded / multipleOf) * multipleOf : rounded;
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

export interface SampleOptions {
  /** The schema's JSON pointer in the document, which lets `conforms` check its examples. */
  readonly pointer?: string;
  /**
   * Whether a value conforms to a schema of the document. Examples and defaults that don't are
   * skipped, since vendors' examples sometimes contradict their own schemas.
   */
  readonly conforms?: (schema: SpecSchema, value: unknown) => boolean;
}

/**
 * Builds a deterministic value for a schema: the first of `examples`, `example` and `default`
 * that conforms to it, then its `const` or first `enum` value, otherwise a placeholder for its
 * type, format and bounds.
 */
export const sampleSchema = (
  schema: unknown,
  document: OpenApiDocument,
  { pointer, conforms }: SampleOptions = {}
): unknown => {
  // `at` is the node's pointer; nodes merged from allOf parts have none, and their examples
  // are used unchecked.
  const sample = (node: unknown, at: string | undefined, depth: number): unknown => {
    if (!isRecord(node) || depth > MAX_DEPTH) {
      return null;
    }
    if (typeof node.$ref === 'string') {
      return sample(resolve(node, document), refToPointer(node.$ref), depth + 1);
    }
    const candidates = [
      ...(Array.isArray(node.examples) ? node.examples : []),
      node.example,
      node.default,
    ].filter((value) => value !== undefined);
    const example = candidates.find(
      (value) => at === undefined || !conforms || conforms({ pointer: at, schema: node }, value)
    );
    if (example !== undefined) {
      return example;
    }
    if (node.const !== undefined) {
      return node.const;
    }
    if (Array.isArray(node.enum) && node.enum.length > 0) {
      return node.enum[0];
    }
    const child = (value: unknown, ...tokens: Array<string | number>) =>
      sample(value, at === undefined ? undefined : appendPointer(at, ...tokens), depth + 1);

    const keyword = Array.isArray(node.oneOf) ? 'oneOf' : 'anyOf';
    const variants = node[keyword];
    if (Array.isArray(variants) && variants.length > 0) {
      // Non-null variants first. A sample of one oneOf variant can match another one too, so
      // with a pointer the first sample the whole node accepts wins.
      const order = variants
        .map((variant, index) => ({ index, isNull: isRecord(variant) && variant.type === 'null' }))
        .sort((a, b) => Number(a.isNull) - Number(b.isNull));
      let first: unknown;
      for (const [position, { index }] of order.entries()) {
        const value = child(variants[index], keyword, index);
        if (at === undefined || !conforms || conforms({ pointer: at, schema: node }, value)) {
          return value;
        }
        first = position === 0 ? value : first;
      }
      return first;
    }
    if (Array.isArray(node.allOf) && node.allOf.length > 0) {
      const { allOf, ...rest } = node;
      return sample(mergeAllOf([rest, ...allOf], document), undefined, depth + 1);
    }

    switch (firstType(node)) {
      case 'object': {
        const required = new Set(Array.isArray(node.required) ? node.required : []);
        const properties = isRecord(node.properties) ? node.properties : {};
        const sampled = Object.entries(properties).flatMap(([name, property]) => {
          if (depth >= SHALLOW_DEPTH && !required.has(name)) {
            return [];
          }
          const value = child(property, 'properties', name);
          return value === null && isRecord(property) && !allowsNull(property)
            ? []
            : [[name, value]];
        });
        return Object.fromEntries(sampled);
      }
      case 'array': {
        const minItems = numberOrUndefined(node.minItems) ?? 0;
        const maxItems = numberOrUndefined(node.maxItems) ?? Infinity;
        const count = Math.min(depth >= SHALLOW_DEPTH ? minItems : Math.max(minItems, 1), maxItems);
        if (Array.isArray(node.items)) {
          return node.items.map((item, index) => child(item, 'items', index));
        }
        return Array.from({ length: count }, () => child(node.items, 'items'));
      }
      case 'string':
        return placeholderString(node);
      case 'integer':
        return placeholderNumber(node, true);
      case 'number':
        return placeholderNumber(node, false);
      case 'boolean':
        return true;
      case 'null':
        return null;
      default:
        return {};
    }
  };
  return sample(schema, pointer, 0);
};
