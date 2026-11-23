/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InvalidSchemaFailure } from './assert_schemas_valid';
import { assertSchemasValid, InvalidSchemaError } from './assert_schemas_valid';
import { describeOperation } from './schema_walk';
import { loadOperations } from './load_operations';
import { normalizeOperations } from './normalize_operations';
import type { ContractOperation, OpenApiDocument } from './types';

/**
 * Loads a spec into operations ready for validation, repairing known vendor schema defects
 * and failing if any schema still has a defect that breaks validation. `source` names the spec
 * in the operations' `spec.source`.
 */
export const loadContractOperations = (
  document: OpenApiDocument,
  source?: string
): ContractOperation[] => {
  const operations = normalizeOperations(loadOperations(document, source));
  assertSchemasValid(operations);
  return operations;
};

/**
 * Like {@link loadContractOperations}, but sets apart the operations whose schemas have defects
 * instead of failing (`broken`), and lists the defects, so one broken operation doesn't take the
 * spec down.
 */
export const loadValidContractOperations = (
  document: OpenApiDocument,
  source?: string
): {
  operations: ContractOperation[];
  broken: ContractOperation[];
  invalid: InvalidSchemaFailure[];
} => {
  const operations = normalizeOperations(loadOperations(document, source));
  try {
    assertSchemasValid(operations);
    return { operations, broken: [], invalid: [] };
  } catch (error) {
    if (!(error instanceof InvalidSchemaError)) {
      throw error;
    }
    const described = new Set(error.failures.map(({ operation }) => operation));
    const isBroken = (operation: ContractOperation) => described.has(describeOperation(operation));
    return {
      operations: operations.filter((operation) => !isBroken(operation)),
      broken: operations.filter(isBroken),
      invalid: [...error.failures],
    };
  }
};

export { InvalidSchemaError } from './assert_schemas_valid';
export { convertDiscovery, isDiscoveryDocument } from './convert_discovery';
export { convertSwagger2 } from './convert_swagger2';
export type { InvalidSchemaFailure } from './assert_schemas_valid';
export type {
  ContractOperation,
  ContractSpec,
  FixedQueryParameter,
  OpenApiDocument,
  SpecSchema,
} from './types';
