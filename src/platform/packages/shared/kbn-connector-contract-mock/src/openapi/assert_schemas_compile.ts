/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Ajv from 'ajv';
import Ajv2019 from 'ajv/dist/2019';
import Ajv2020 from 'ajv/dist/2020';
import { describeOperation, getBundleRefName, getOperationSchemas, isRecord } from './schema_walk';
import type { ContractOperation, SchemaBundle } from './types';

export interface SchemaCompileFailure {
  readonly operation: string;
  readonly location: string;
  readonly message: string;
}

const MAX_LISTED_FAILURES = 20;

/** Thrown when a spec contains schemas that cannot be compiled into validators. */
export class SchemaCompileError extends Error {
  constructor(public readonly failures: readonly SchemaCompileFailure[]) {
    const listed = failures
      .slice(0, MAX_LISTED_FAILURES)
      .map(({ operation, location, message }) => `  ${operation} (${location}): ${message}`);
    const remaining = failures.length - listed.length;
    super(
      [
        `${failures.length} schema(s) cannot be compiled:`,
        ...listed,
        ...(remaining > 0 ? [`  ...and ${remaining} more`] : []),
      ].join('\n')
    );
    this.name = 'SchemaCompileError';
  }
}

// Same options as Prism's validator, so a schema that compiles here also compiles there.
const AJV_OPTIONS = {
  allErrors: true,
  allowUnionTypes: true,
  allowMatchingProperties: true,
  strict: false,
  logger: false,
} as const;

const DRAFT_2019_09 = /^https?:\/\/json-schema.org\/draft\/2019-09\/schema#?$/;
const DRAFT_2020_12 = /^https?:\/\/json-schema.org\/draft\/2020-12\/schema#?$/;
const REGISTRY_BASE = 'https://contract-mock.invalid/bundle/';

const toRegistryId = (name: string): string => REGISTRY_BASE + encodeURIComponent(name);

// Copies a schema with bundle refs pointing at registered schemas, so Ajv compiles each
// component once instead of once per operation schema that reaches it.
const withRegistryRefs = (node: unknown, copies: Map<object, unknown>): unknown => {
  if (typeof node !== 'object' || node === null) {
    return node;
  }
  const existing = copies.get(node);
  if (existing !== undefined) {
    return existing;
  }
  if (Array.isArray(node)) {
    const copy: unknown[] = [];
    copies.set(node, copy);
    copy.push(...node.map((item) => withRegistryRefs(item, copies)));
    return copy;
  }
  const copy: Record<string, unknown> = {};
  copies.set(node, copy);
  for (const [key, value] of Object.entries(node)) {
    const name = key === '$ref' ? getBundleRefName(value) : undefined;
    copy[key] = name === undefined ? withRegistryRefs(value, copies) : toRegistryId(name);
  }
  return copy;
};

const createValidator = (
  AjvClass: typeof Ajv,
  bundle: SchemaBundle,
  copies: Map<object, unknown>
) => {
  const ajv = new AjvClass(AJV_OPTIONS);
  for (const [name, schema] of Object.entries(bundle)) {
    const copy = withRegistryRefs(schema, copies);
    if (isRecord(copy)) {
      // Prism nests components under the operation schema, where neither `$schema` applies
      // nor meta-schema validation runs, so mirror both here.
      const { $schema, ...rest } = copy;
      ajv.addSchema(rest, toRegistryId(name), undefined, false);
    }
  }
  return ajv;
};

/**
 * Compiles every schema of every operation and throws a {@link SchemaCompileError} listing
 * the ones that fail. Prism treats a schema that fails to compile as matching any value,
 * which would silently disable validation for the affected operations.
 */
export const assertSchemasCompile = (operations: readonly ContractOperation[]): void => {
  const failures: SchemaCompileFailure[] = [];
  const validatorsByBundle = new Map<SchemaBundle, Map<typeof Ajv, Ajv>>();

  for (const operation of operations) {
    const bundle = operation.__bundled__;
    const validators = validatorsByBundle.get(bundle) ?? new Map<typeof Ajv, Ajv>();
    validatorsByBundle.set(bundle, validators);
    const copies = new Map<object, unknown>();

    for (const { location, schema } of getOperationSchemas(operation)) {
      const { $schema = '' } = schema;
      const AjvClass = DRAFT_2019_09.test($schema)
        ? Ajv2019
        : DRAFT_2020_12.test($schema)
        ? Ajv2020
        : Ajv;
      const ajv = validators.get(AjvClass) ?? createValidator(AjvClass, bundle, copies);
      validators.set(AjvClass, ajv);
      const copy = withRegistryRefs(schema, copies);
      try {
        if (isRecord(copy)) {
          ajv.compile(copy);
        }
      } catch (error) {
        failures.push({
          operation: describeOperation(operation),
          location,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  if (failures.length > 0) {
    throw new SchemaCompileError(failures);
  }
};
