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
import type { LogDocumentOverview } from '../types';
import { getFirstAvailableFieldValue } from './get_field_value_with_fallback';

export const getMessageFieldWithFallbacks = (
  doc: LogDocumentOverview,
  { includeFormattedValue = false }: { includeFormattedValue?: boolean } = {}
) => {
  const rankingOrder = [
    fieldConstants.MESSAGE_FIELD,
    fieldConstants.ERROR_MESSAGE_FIELD,
    fieldConstants.EVENT_ORIGINAL_FIELD,
  ] as const;

  for (const rank of rankingOrder) {
    const value = doc[rank];

    if (value !== undefined && value !== null) {
      let formattedValue: string | undefined;

      if (includeFormattedValue) {
        try {
          formattedValue = JSON.stringify(JSON.parse(unescape(value)), null, 2);
        } catch {
          // If the value is not a valid JSON, leave it unformatted
        }
      }

      return { field: rank, value, formattedValue };
    }
  }

  // If none of the ranks (fallbacks) are present
  return { field: undefined };
};

/**
 * Gets the message field value with OTel fallbacks from a raw document.
 * Checks: message → body.text → error.message → event.original
 * This version works directly with document records and includes OTel field fallbacks.
 */
export const getMessageFieldValueWithOtelFallback = (
  document: Record<string, any>,
  { includeFormattedValue = false }: { includeFormattedValue?: boolean } = {}
) => {
  const rankingOrder = [
    fieldConstants.MESSAGE_FIELD,
    fieldConstants.ERROR_MESSAGE_FIELD,
    fieldConstants.EVENT_ORIGINAL_FIELD,
  ] as const;

  const { field, value } = getFirstAvailableFieldValue(document, rankingOrder);

  if (field && value !== undefined && value !== null) {
    let formattedValue: string | undefined;

    if (includeFormattedValue) {
      try {
        formattedValue = JSON.stringify(JSON.parse(unescape(value)), null, 2);
      } catch {
        // If the value is not a valid JSON, leave it unformatted
      }
    }

    return { field, value, formattedValue };
  }

  // If none of the ranks (fallbacks) are present
  return { field: undefined };
};
