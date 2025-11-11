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

import type { SimplifiedFilter, Filter } from '@kbn/es-query-server';

/**
 * Extract base properties from stored filter
 */
export function extractBaseProperties(storedFilter: Filter): Partial<SimplifiedFilter> {
  const $state = storedFilter.$state;
  const meta = storedFilter.meta;

  return {
    id: meta?.key || undefined,
    pinned:
      $state?.store === 'globalState' ? true : $state?.store === 'appState' ? false : undefined,
    disabled: meta?.disabled === true ? true : meta?.disabled === false ? false : undefined,
    controlledBy: meta?.controlledBy || undefined,
    indexPattern: meta?.index || undefined,
    negate: meta?.negate === true ? true : meta?.negate === false ? false : undefined,
    label: meta?.alias || undefined,
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
