/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY_LABEL, MISSING_TOKEN, NULL_LABEL } from '@kbn/field-formats-common';

/**
 * Checks for missing values and returns appropriate HTML representation.
 * Used by both FieldFormat class and HTML content type fallback to ensure
 * consistent handling of empty, null, undefined, and missing token values.
 *
 * @param val - The value to check for missing state
 * @returns HTML string wrapped in span with appropriate label for missing values,
 *          or undefined if the value is present and should be processed normally
 */
export const checkForMissingValueHtml = (val: unknown): string | undefined => {
  if (val === '') {
    return `<span class="ffString__emptyValue">${EMPTY_LABEL}</span>`;
  }
  if (val == null || val === MISSING_TOKEN) {
    return `<span class="ffString__emptyValue">${NULL_LABEL}</span>`;
  }
  return undefined;
};
