/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Filter conversion functions for SimplifiedFilter interface
 *
 * This module provides bi-directional conversion between SimplifiedFilter
 * and stored Filter formats, with comprehensive validation and type safety.
 */

// Main conversion functions
export { fromStoredFilter } from './from_stored_filter';
export { toStoredFilter } from './to_stored_filter';
export { validate } from './validation';

// Individual conversion functions for unit testing
export {
  convertToSimpleCondition,
  convertToFilterGroup,
  convertWithEnhancement,
  parseQueryFilter,
  convertToRawDSLWithReason,
  extractFieldFromQuery,
} from './from_stored_filter';

export {
  convertFromSimpleCondition,
  convertFromFilterGroup,
  convertFromDSLFilter,
} from './to_stored_filter';

// Validation functions
export {
  validateSimplifiedFilter,
  validateSimpleCondition,
  validateFilterGroup,
  validateDSLFilter,
} from './validation';

// Type guards
export {
  isFullyCompatible,
  isEnhancedCompatible,
  isStoredGroupFilter,
  isConditionFilter,
  isGroupFilter,
  isDSLFilter,
  isConditionWithValue,
  isExistenceCondition,
  isNestedFilterGroup,
} from './type_guards';

// Utilities
export { extractBaseProperties, getFilterTypeForOperator } from './utils';
