/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { allDoubleQuoteRE, nonAlphaNumRE } from './constants';
import { cellHasFormulas } from './formula_checks';

type RawValue = string | object | null | undefined;

export function createEscapeValue(
  quoteValues: boolean,
  escapeFormulas: boolean
): (val: RawValue) => string {
  return function escapeValue(val: RawValue) {
    if (val && typeof val === 'string') {
      const formulasEscaped = escapeFormulas && cellHasFormulas(val) ? "'" + val : val;
      if (quoteValues && nonAlphaNumRE.test(formulasEscaped)) {
        return `"${formulasEscaped.replace(allDoubleQuoteRE, '""')}"`;
      }
    }
    return val == null ? '' : val.toString();
  };
}
