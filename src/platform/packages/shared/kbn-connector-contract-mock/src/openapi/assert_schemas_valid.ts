/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveSchemaRef } from './schema_validator';
import type { SchemaNode } from './schema_walk';
import { describeOperation, getOperationSchemas, isRecord, walkSchema } from './schema_walk';
import type { ContractOperation, ContractSpec } from './types';

export interface InvalidSchemaFailure {
  readonly operation: string;
  readonly location: string;
  readonly message: string;
}

const MAX_LISTED_FAILURES = 20;

/** Thrown when a spec contains schemas that cannot be validated against. */
export class InvalidSchemaError extends Error {
  constructor(public readonly failures: readonly InvalidSchemaFailure[]) {
    const listed = failures
      .slice(0, MAX_LISTED_FAILURES)
      .map(({ operation, location, message }) => `  ${operation} (${location}): ${message}`);
    const remaining = failures.length - listed.length;
    super(
      [
        `${failures.length} schema(s) are invalid:`,
        ...listed,
        ...(remaining > 0 ? [`  ...and ${remaining} more`] : []),
      ].join('\n')
    );
    this.name = 'InvalidSchemaError';
  }
}

const TYPES = new Set(['array', 'boolean', 'integer', 'null', 'number', 'object', 'string']);
const SCHEMA_LIST_KEYWORDS = ['allOf', 'anyOf', 'oneOf'] as const;
const NUMBER_KEYWORDS = [
  'exclusiveMaximum',
  'exclusiveMinimum',
  'maximum',
  'maxItems',
  'maxLength',
  'maxProperties',
  'minimum',
  'minItems',
  'minLength',
  'minProperties',
  'multipleOf',
] as const;

const describePatternError = (pattern: unknown): string | undefined => {
  if (typeof pattern !== 'string') {
    return `pattern ${JSON.stringify(pattern)} is not a string`;
  }
  try {
    new RegExp(pattern, 'u');
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

const isSchema = (value: unknown): boolean => isRecord(value) || typeof value === 'boolean';

// Covers the keyword values a validator would throw on or misread; validators only check
// instances, so these defects would otherwise surface on the first request that hits them.
const describeDefect = (spec: ContractSpec, schema: SchemaNode): string | undefined => {
  const { $ref, type, required, enum: enumValues, patternProperties } = schema;
  if ($ref !== undefined && (typeof $ref !== 'string' || !resolveSchemaRef(spec, $ref))) {
    return `$ref ${JSON.stringify($ref)} does not resolve to a schema`;
  }
  const types = type === undefined ? [] : Array.isArray(type) ? type : [type];
  const unknownType = types.find((value) => typeof value !== 'string' || !TYPES.has(value));
  if (unknownType !== undefined) {
    return `type ${JSON.stringify(unknownType)} is not a JSON Schema type`;
  }
  const patterns = [
    ...('pattern' in schema ? [schema.pattern] : []),
    ...(isRecord(patternProperties) ? Object.keys(patternProperties) : []),
  ];
  for (const pattern of patterns) {
    const patternError = describePatternError(pattern);
    if (patternError) {
      return patternError;
    }
  }
  if (
    required !== undefined &&
    (!Array.isArray(required) || required.some((name) => typeof name !== 'string'))
  ) {
    return 'required is not a list of property names';
  }
  if (enumValues !== undefined && !Array.isArray(enumValues)) {
    return 'enum is not a list';
  }
  for (const keyword of SCHEMA_LIST_KEYWORDS) {
    const value = schema[keyword];
    if (value !== undefined && (!Array.isArray(value) || !value.length || !value.every(isSchema))) {
      return `${keyword} is not a non-empty list of schemas`;
    }
  }
  const nonNumber = NUMBER_KEYWORDS.find(
    (keyword) => keyword in schema && typeof schema[keyword] !== 'number'
  );
  if (nonNumber) {
    return `${nonNumber} is not a number`;
  }
};

/**
 * Checks every schema of every operation, following refs, and throws an
 * {@link InvalidSchemaError} listing the operations and locations whose schemas have defects, so
 * a broken spec fails at load instead of on the first request that uses it.
 */
export const assertSchemasValid = (operations: readonly ContractOperation[]): void => {
  const defects = new Map<object, string>();
  const seenBySpec = new Map<ContractSpec, WeakSet<object>>();
  for (const operation of operations) {
    const { spec } = operation;
    const seen = seenBySpec.get(spec) ?? new WeakSet<object>();
    seenBySpec.set(spec, seen);
    const resolveRef = (ref: string) => resolveSchemaRef(spec, ref);
    for (const { schema } of getOperationSchemas(operation)) {
      walkSchema(
        schema.schema,
        (node) => {
          const defect = describeDefect(spec, node);
          if (defect) {
            defects.set(node, defect);
          }
        },
        { seen, resolveRef }
      );
    }
  }
  if (defects.size === 0) {
    return;
  }
  // Schemas are shared, so each location is walked again to attribute defects to every
  // operation and location that reaches them.
  const failures: InvalidSchemaFailure[] = [];
  for (const operation of operations) {
    const resolveRef = (ref: string) => resolveSchemaRef(operation.spec, ref);
    for (const { location, schema } of getOperationSchemas(operation)) {
      let message: string | undefined;
      walkSchema(
        schema.schema,
        (node) => {
          message ??= defects.get(node);
        },
        { resolveRef }
      );
      if (message) {
        failures.push({ operation: describeOperation(operation), location, message });
      }
    }
  }
  throw new InvalidSchemaError(failures);
};
