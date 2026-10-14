/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual, uniqWith } from 'lodash';
import { getAtPointer, refToPointer } from './json_pointer';
import type { SchemaNode } from './schema_walk';
import { getOperationSchemas, walkSchema } from './schema_walk';
import type { ContractOperation, ContractSpec } from './types';

const SYNTAX_CHARACTERS = new Set('^$\\.*+?()[]{}|/');
const ESCAPE_LETTERS = new Set('bBdDwWsSfnrtv0123456789cxupPk');

const isUnicodeRegExp = (pattern: string): boolean => {
  try {
    return new RegExp(pattern, 'u') instanceof RegExp;
  } catch {
    return false;
  }
};

/**
 * Schema validators compile patterns with the `u` flag, which rejects identity escapes such as
 * `\_` that vendor specs commonly use. Drops the backslash from those escapes.
 */
export const toUnicodePattern = (pattern: string): string => {
  if (isUnicodeRegExp(pattern)) {
    return pattern;
  }
  let result = '';
  let inClass = false;
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === '\\' && index + 1 < pattern.length) {
      const next = pattern[++index];
      const isValidEscape =
        SYNTAX_CHARACTERS.has(next) || ESCAPE_LETTERS.has(next) || (inClass && next === '-');
      result += isValidEscape ? `\\${next}` : next;
      continue;
    }
    if (char === '[') {
      inClass = true;
    } else if (char === ']') {
      inClass = false;
    }
    result += char;
  }
  return result;
};

// JSON Schema has no `nullable`; OpenAPI 3.0's `nullable: true` means the schema also accepts null.
const toNullUnion = (schema: SchemaNode): void => {
  if (!('nullable' in schema)) {
    return;
  }
  const { nullable, ...rest } = schema;
  delete schema.nullable;
  if (nullable !== true || Object.keys(rest).length === 0) {
    return;
  }
  if (schema.type === undefined) {
    for (const key of Object.keys(rest)) {
      delete schema[key];
    }
    schema.anyOf = [rest, { type: 'null' }];
    return;
  }
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!types.includes('null')) {
    schema.type = [...types, 'null'];
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(null)) {
    schema.enum = [...schema.enum, null];
  }
};

const normalizeSchema = (schema: SchemaNode): void => {
  if (typeof schema.pattern === 'string') {
    schema.pattern = toUnicodePattern(schema.pattern);
  }
  if (Array.isArray(schema.enum)) {
    schema.enum = uniqWith(schema.enum, isEqual);
  }
  toNullUnion(schema);
};

// OpenAPI 3.0 inherits draft-04's boolean `exclusiveMinimum`/`exclusiveMaximum`; draft-07 and
// later only define the numeric form.
const toNumericExclusiveBounds = (schema: SchemaNode): void => {
  for (const [exclusive, bound] of [
    ['exclusiveMinimum', 'minimum'],
    ['exclusiveMaximum', 'maximum'],
  ] as const) {
    if (typeof schema[exclusive] !== 'boolean') {
      continue;
    }
    if (schema[exclusive] === true && typeof schema[bound] === 'number') {
      schema[exclusive] = schema[bound];
      delete schema[bound];
    } else {
      delete schema[exclusive];
    }
  }
};

/**
 * Repairs schema defects found in vendor specs, and rewrites OpenAPI 3.0 extensions as plain
 * JSON Schema, in place in
 * each spec document and following refs, so every schema an operation uses is covered.
 */
export const normalizeOperations = (operations: ContractOperation[]): ContractOperation[] => {
  const seenBySpec = new Map<ContractSpec, WeakSet<object>>();
  for (const operation of operations) {
    const { spec } = operation;
    const seen = seenBySpec.get(spec) ?? new WeakSet<object>();
    seenBySpec.set(spec, seen);
    const resolveRef = (ref: string) => getAtPointer(spec.document, refToPointer(ref));
    const visit = (schema: SchemaNode) => {
      normalizeSchema(schema);
      if (spec.dialect === 'openapi-3.0') {
        toNumericExclusiveBounds(schema);
      }
    };
    for (const { schema } of getOperationSchemas(operation)) {
      walkSchema(schema.schema, visit, { seen, resolveRef });
    }
  }
  return operations;
};
