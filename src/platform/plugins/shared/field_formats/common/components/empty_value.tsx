/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, memo } from 'react';
import { EMPTY_LABEL, NULL_LABEL, MISSING_TOKEN } from '@kbn/field-formats-common';

/**
 * CSS class for styling empty/missing values
 */
export const EMPTY_VALUE_CLASS = 'ffString__emptyValue';

export interface EmptyValueProps {
  /**
   * The value to check for empty/missing state
   */
  value: unknown;
}

/**
 * Component that renders empty/missing values with appropriate styling.
 *
 * This is the React equivalent of the HTML pattern:
 * `<span class="ffString__emptyValue">(empty string)</span>`
 *
 * Returns null if the value is not considered empty/missing.
 *
 * @example
 * const missingValue = checkForMissingValueReact(val);
 * if (missingValue) return missingValue;
 * // continue with normal formatting
 */
export const EmptyValue: FC<EmptyValueProps> = memo(({ value }) => {
  if (value === '') {
    return <span className={EMPTY_VALUE_CLASS}>{EMPTY_LABEL}</span>;
  }
  if (value == null || value === MISSING_TOKEN) {
    return <span className={EMPTY_VALUE_CLASS}>{NULL_LABEL}</span>;
  }
  return null;
});

EmptyValue.displayName = 'EmptyValue';

/**
 * Check if a value is empty/missing and return the appropriate React element.
 *
 * This is the React equivalent of `checkForMissingValueHtml` in FieldFormat.
 * Use this in formatters' reactConvert implementations.
 *
 * @param value - The value to check
 * @returns A React element for empty values, or undefined if not empty
 *
 * @example
 * reactConvert: ReactContextTypeConvert = (val) => {
 *   const missing = checkForMissingValueReact(val);
 *   if (missing) return missing;
 *   // Normal conversion logic here
 *   return <span>{formattedValue}</span>;
 * };
 */
export const checkForMissingValueReact = (value: unknown): React.ReactElement | undefined => {
  if (value === '') {
    return <span className={EMPTY_VALUE_CLASS}>{EMPTY_LABEL}</span>;
  }
  if (value == null || value === MISSING_TOKEN) {
    return <span className={EMPTY_VALUE_CLASS}>{NULL_LABEL}</span>;
  }
  return undefined;
};
