/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Validation functions for SimplifiedFilter
 */

import type {
  SimplifiedFilter,
  SimpleFilterCondition,
  FilterGroup,
  RawDSLFilter,
} from '@kbn/es-query-server';
import type { ValidationResult, ValidationError } from '../types';
import { FilterConversionError } from '../errors';
import {
  isConditionFilter,
  isGroupFilter,
  isDSLFilter,
  isConditionWithValue,
  isExistenceCondition,
  isNestedFilterGroup,
} from './type_guards';

/**
 * Validate SimplifiedFilter structure and values
 */
export function validate(filter: SimplifiedFilter): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  try {
    // Check discriminated union constraint using type guards
    const hasCondition = isConditionFilter(filter);
    const hasGroup = isGroupFilter(filter);
    const hasDSL = isDSLFilter(filter);

    const count = [hasCondition, hasGroup, hasDSL].filter(Boolean).length;

    if (count === 0) {
      errors.push({
        path: 'root',
        message: 'Filter must have exactly one of: condition, group, or dsl',
        code: 'MISSING_FILTER_TYPE',
      });
    } else if (count > 1) {
      errors.push({
        path: 'root',
        message: 'Filter cannot have multiple types (condition, group, dsl) simultaneously',
        code: 'MULTIPLE_FILTER_TYPES',
      });
    }

    // Validate specific filter types using type guards
    if (isConditionFilter(filter)) {
      validateSimpleCondition(filter.condition, errors);
    }

    if (isGroupFilter(filter)) {
      validateFilterGroup(filter.group, errors);
    }

    if (isDSLFilter(filter)) {
      validateDSLFilter(filter.dsl, errors);
    }

    // Add warnings for potentially problematic configurations
    if (filter.disabled && filter.pinned) {
      warnings.push('Pinned filters are typically not disabled');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    errors.push({
      path: 'root',
      message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      code: 'VALIDATION_ERROR',
    });

    return {
      valid: false,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

/**
 * Validate SimplifiedFilter and throw if invalid
 */
export function validateSimplifiedFilter(filter: SimplifiedFilter): void {
  const validationResult = validate(filter);
  if (!validationResult.valid) {
    const errorMessages = validationResult.errors.map((e) => e.message).join(', ');
    throw new FilterConversionError(`Invalid SimplifiedFilter: ${errorMessages}`);
  }
}

/**
 * Validate simple condition
 */
export function validateSimpleCondition(
  condition: SimpleFilterCondition,
  errors: ValidationError[]
): void {
  if (!condition.field?.trim()) {
    errors.push({
      path: 'condition.field',
      message: 'Field name is required and cannot be empty',
      code: 'INVALID_FIELD',
    });
  }

  // Validate operator-specific constraints using type guards
  if (isExistenceCondition(condition) && 'value' in condition && condition.value !== undefined) {
    errors.push({
      path: 'condition.value',
      message: 'Exists/not_exists operators should not have a value',
      code: 'UNEXPECTED_VALUE',
    });
  }

  if (
    isConditionWithValue(condition) &&
    (!('value' in condition) || condition.value === undefined)
  ) {
    errors.push({
      path: 'condition.value',
      message: 'Value is required for non-existence operators',
      code: 'MISSING_VALUE',
    });
  }
}

/**
 * Validate filter group
 */
export function validateFilterGroup(group: FilterGroup, errors: ValidationError[]): void {
  if (!group.conditions?.length) {
    errors.push({
      path: 'group.conditions',
      message: 'Filter group must have at least one condition',
      code: 'EMPTY_GROUP',
    });
  }

  // Recursively validate conditions
  group.conditions?.forEach((condition) => {
    const typedCondition = condition as SimpleFilterCondition | FilterGroup;
    if (isNestedFilterGroup(typedCondition)) {
      validateFilterGroup(typedCondition, errors);
    } else {
      validateSimpleCondition(typedCondition, errors);
    }
  });
}

/**
 * Validate DSL filter
 */
export function validateDSLFilter(dsl: RawDSLFilter, errors: ValidationError[]): void {
  if (!dsl.query || typeof dsl.query !== 'object') {
    errors.push({
      path: 'dsl.query',
      message: 'DSL query must be a valid object',
      code: 'INVALID_DSL',
    });
  }
}
