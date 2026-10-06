/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual, uniqWith } from 'lodash';
import type { SchemaNode } from './schema_walk';
import { getOperationSchemas, walkSchema } from './schema_walk';
import type { ContractOperation } from './types';

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
 * Ajv compiles patterns with the `u` flag, which rejects identity escapes such as `\_`
 * that vendor specs commonly use. Drops the backslash from those escapes.
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

const normalizeSchema = (schema: SchemaNode): void => {
  if (typeof schema.pattern === 'string') {
    schema.pattern = toUnicodePattern(schema.pattern);
  }
  if (Array.isArray(schema.enum)) {
    schema.enum = uniqWith(schema.enum, isEqual);
  }
  // Ajv rejects `nullable` without `type`; express it as a union with null instead.
  if ('nullable' in schema && schema.type === undefined) {
    const { nullable, $schema, ...rest } = schema;
    for (const key of Object.keys(schema)) {
      delete schema[key];
    }
    if ($schema !== undefined) {
      schema.$schema = $schema;
    }
    if (nullable === true && Object.keys(rest).length > 0) {
      schema.anyOf = [rest, { type: 'null' }];
    } else {
      Object.assign(schema, rest);
    }
  }
};

// Prism's parameter deserializers compare `schema.type` to a single string, so a
// `["array", "null"]` query parameter is not split into items.
const dropNullParameterType = (schema: SchemaNode): void => {
  if (Array.isArray(schema.type)) {
    const types = schema.type.filter((type) => type !== 'null');
    if (types.length === 1) {
      schema.type = types[0];
    }
  }
};

/** Repairs schema defects found in vendor specs that Ajv or Prism would otherwise reject. */
export const normalizeOperations = (operations: ContractOperation[]): ContractOperation[] => {
  const seen = new WeakSet<object>();
  for (const operation of operations) {
    for (const schema of Object.values(operation.__bundled__)) {
      walkSchema(schema, normalizeSchema, seen);
    }
    for (const { kind, schema } of getOperationSchemas(operation)) {
      walkSchema(schema, normalizeSchema, seen);
      if (kind === 'parameter') {
        walkSchema(schema, dropNullParameterType);
      }
    }
  }
  return operations;
};
