/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSchemaValidator } from './schema_compiler';
import { describeOperation, getOperationSchemas } from './schema_walk';
import type { ContractOperation } from './types';

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

/**
 * Compiles every schema of every operation and throws a {@link SchemaCompileError} listing the
 * ones that fail, so a broken spec fails at load instead of on the first request that uses it.
 */
export const assertSchemasCompile = (operations: readonly ContractOperation[]): void => {
  const failures: SchemaCompileFailure[] = [];
  for (const operation of operations) {
    for (const { location, schema } of getOperationSchemas(operation)) {
      try {
        getSchemaValidator(operation.spec, schema);
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
