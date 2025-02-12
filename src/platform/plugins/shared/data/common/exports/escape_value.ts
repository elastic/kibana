/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { allDoubleQuoteRE, commonQuotedDelimiters, nonAlphaNumRE } from './constants';
import { cellHasFormulas } from './formula_checks';

type RawValue = string | object | null | undefined;

// string with the delimiter/separator already inside need to be wrapped in quotes
// i.e. string with delimiter char in it like free text or some number formatting (1143 => 1,143)
function shouldBeQuoted(value: string, delimiter: string) {
  const trimmedSeparator = delimiter.trim();
  return value.includes(trimmedSeparator) && commonQuotedDelimiters.has(trimmedSeparator);
}

/**
 * Create a function that will escape CSV values like "=", "@" and "+" with a
 * "'". This will also place CSV values in "" if contain non-alphanumeric chars.
 *
 * For example:
 *
 * Given: =1+1
 * Returns: "'=1+1"
 *
 * See OWASP: https://www.owasp.org/index.php/CSV_Injection.
 */
export function createEscapeValue({
  separator,
  quoteValues,
  escapeFormulaValues,
}: {
  separator: string;
  quoteValues: boolean;
  escapeFormulaValues: boolean;
}): (val: RawValue) => string {
  return function escapeValue(val: RawValue) {
    if (val && typeof val === 'string') {
      const formulasEscaped = escapeFormulaValues && cellHasFormulas(val) ? "'" + val : val;
      if (quoteValues) {
        if (nonAlphaNumRE.test(formulasEscaped)) {
          return `"${formulasEscaped.replace(allDoubleQuoteRE, '""')}"`;
        }
      }
    }
    // raw multi-terms are stringified as T1,T2,T3 so check if the final value contains the
    // csv separator before returning (usually for raw values)
    const stringVal = val == null ? '' : val.toString();
    return quoteValues && shouldBeQuoted(stringVal, separator) ? `"${stringVal}"` : stringVal;
  };
}
