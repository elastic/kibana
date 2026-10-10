/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertSchemasValid } from './assert_schemas_valid';
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

export { InvalidSchemaError } from './assert_schemas_valid';
export { convertDiscovery, isDiscoveryDocument } from './convert_discovery';
export { convertSwagger2 } from './convert_swagger2';
export type { InvalidSchemaFailure } from './assert_schemas_valid';
export type { ContractOperation, ContractSpec, OpenApiDocument, SpecSchema } from './types';
