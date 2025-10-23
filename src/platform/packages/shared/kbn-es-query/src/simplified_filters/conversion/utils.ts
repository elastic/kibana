/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Utility functions for filter conversion
 */

import type { SimplifiedFilter } from '@kbn/es-query-server';

/**
 * Extract base properties from stored filter
 */
export function extractBaseProperties(storedFilter: any): Partial<SimplifiedFilter> {
  return {
    id: storedFilter.meta?.key || undefined,
    pinned: storedFilter.$state?.store === 'globalState' || undefined,
    disabled: storedFilter.meta?.disabled || undefined,
    controlledBy: storedFilter.meta?.controlledBy || undefined,
    indexPattern: storedFilter.meta?.index || undefined,
    metadata: storedFilter.meta?.params || undefined,
    negate: storedFilter.meta?.negate || undefined,
    label: storedFilter.meta?.alias || undefined,
  };
}

/**
 * Get filter type name for operator
 */
export function getFilterTypeForOperator(operator: string): string {
  switch (operator) {
    case 'exists':
    case 'not_exists':
      return 'exists';
    case 'range':
      return 'range';
    case 'is_one_of':
    case 'is_not_one_of':
      return 'terms';
    default:
      return 'phrase';
  }
}
