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

import type { AsCodeFilter } from '@kbn/es-query-server';
import { ASCODE_FILTER_OPERATOR } from '@kbn/es-query-constants';
import type { StoredFilter } from './types';

/**
 * Extract base properties from stored filter
 */
export function extractBaseProperties(storedFilter: StoredFilter): Partial<AsCodeFilter> {
  const $state = storedFilter.$state;
  const meta = storedFilter.meta;

  return {
    pinned:
      $state?.store === 'globalState' ? true : $state?.store === 'appState' ? false : undefined,
    disabled: meta?.disabled === true ? true : meta?.disabled === false ? false : undefined,
    controlledBy: meta?.controlledBy || undefined,
    dataViewId: meta?.index || undefined,
    negate: meta?.negate === true ? true : meta?.negate === false ? false : undefined,
    label: meta?.alias || undefined,
    // New properties for preserving metadata
    isMultiIndex:
      meta?.isMultiIndex === true ? true : meta?.isMultiIndex === false ? false : undefined,
    filterType: meta?.type || undefined,
    key: meta?.key || undefined,
    value: meta?.value || undefined,
  };
}

/**
 * Get filter type name for operator
 */
export function getFilterTypeForOperator(operator: string): string {
  switch (operator) {
    case ASCODE_FILTER_OPERATOR.EXISTS:
    case ASCODE_FILTER_OPERATOR.NOT_EXISTS:
      return 'exists';
    case ASCODE_FILTER_OPERATOR.RANGE:
      return 'range';
    case ASCODE_FILTER_OPERATOR.IS_ONE_OF:
    case ASCODE_FILTER_OPERATOR.IS_NOT_ONE_OF:
      return 'terms';
    default:
      return 'phrase';
  }
}
