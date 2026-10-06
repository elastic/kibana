/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertSchemasCompile } from './assert_schemas_compile';
import { loadOperations } from './load_operations';
import { normalizeOperations } from './normalize_operations';
import type { ContractOperation, OpenApiDocument } from './types';

/**
 * Loads a spec into operations ready for validation, repairing known vendor schema defects
 * and failing if any schema still cannot be compiled.
 */
export const loadContractOperations = (document: OpenApiDocument): ContractOperation[] => {
  const operations = normalizeOperations(loadOperations(document));
  assertSchemasCompile(operations);
  return operations;
};

export { SchemaCompileError } from './assert_schemas_compile';
export type { SchemaCompileFailure } from './assert_schemas_compile';
export type { ContractOperation, ContractSpec, OpenApiDocument, SpecSchema } from './types';
