/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { unescape } from 'lodash';
import { fieldConstants } from '..';
import { getFirstAvailableFieldValue } from './get_field_value_with_fallback';

export const getMessageFieldWithFallbacks = (
  doc: Record<string, unknown>,
  { includeFormattedValue = false }: { includeFormattedValue?: boolean } = {}
) => {
  const rankingOrder = [
    fieldConstants.MESSAGE_FIELD,
    fieldConstants.ERROR_MESSAGE_FIELD,
    fieldConstants.EVENT_ORIGINAL_FIELD,
  ] as const;

  const { field, value } = getFirstAvailableFieldValue(doc, rankingOrder);

  const valueAsString = value !== undefined && value !== null ? String(value) : undefined;

  if (field && valueAsString !== undefined && valueAsString !== null) {
    let formattedValue: string | undefined;

    if (includeFormattedValue) {
      try {
        formattedValue = JSON.stringify(JSON.parse(unescape(valueAsString)), null, 2);
      } catch {
        // If the value is not a valid JSON, leave it unformatted
      }
    }

    return { field, value: valueAsString, formattedValue };
  }

  // If none of the ranks (fallbacks) are present
  return { field: undefined };
};
