/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { ESQLCallbacks } from './src/shared/types';

/**
 * High level functions
 */

// Validation function
export { validateQuery } from './src/validation/validation';
// Autocomplete function
export { suggest } from './src/autocomplete/autocomplete';
/**
 * Some utility functions that can be useful to build more feature
 * for the ES|QL language
 */
export { collectUserDefinedColumns } from './src/shared/user_defined_columns';
export {
  getAllFunctions,
  isSupportedFunction,
  printFunctionSignature,
  checkFunctionArgMatchesDefinition as isEqualType,
} from './src/shared/helpers';

export {
  getFieldsByTypeHelper,
  getPolicyHelper,
  getSourcesHelper,
} from './src/shared/resources_helpers';
