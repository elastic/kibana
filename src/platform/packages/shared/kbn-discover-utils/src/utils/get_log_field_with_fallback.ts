/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogDocumentOverview } from '../types';
import { getFirstAvailableFieldValue } from './get_field_value_with_fallback';
import { tryPrettyPrintJson } from './try_format_as_structured_value';

export const getLogFieldWithFallback = <T extends keyof LogDocumentOverview>(
  doc: Record<string, unknown> | LogDocumentOverview,
  rankingOrder: readonly T[],
  options: { includeFormattedValue?: boolean; includeOriginalValue?: boolean } = {}
) => {
  const { includeFormattedValue = false, includeOriginalValue = false } = options;
  const { field, value } = getFirstAvailableFieldValue(
    doc as Record<string, unknown>,
    rankingOrder
  );
  const valueAsString = value !== undefined && value !== null ? String(value) : undefined;
  if (field && valueAsString !== undefined && valueAsString !== null) {
    const formattedValue = includeFormattedValue ? tryPrettyPrintJson(valueAsString) : undefined;

    return {
      field,
      value: valueAsString,
      formattedValue,
      originalValue: includeOriginalValue ? value : undefined,
    };
  }

  // If none of the ranks (fallbacks) are present
  return { field: undefined };
};
