/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY_LABEL, MISSING_TOKEN, NULL_LABEL } from '@kbn/field-formats-common';
import { checkForMissingValueHtml } from './missing_value_html';

describe('checkForMissingValueHtml', () => {
  describe('missing values', () => {
    test('returns HTML for empty string', () => {
      expect(checkForMissingValueHtml('')).toBe(
        `<span class="ffString__emptyValue">${EMPTY_LABEL}</span>`
      );
    });

    test('returns HTML for null', () => {
      expect(checkForMissingValueHtml(null)).toBe(
        `<span class="ffString__emptyValue">${NULL_LABEL}</span>`
      );
    });

    test('returns HTML for undefined', () => {
      expect(checkForMissingValueHtml(undefined)).toBe(
        `<span class="ffString__emptyValue">${NULL_LABEL}</span>`
      );
    });

    test('returns HTML for missing token', () => {
      expect(checkForMissingValueHtml(MISSING_TOKEN)).toBe(
        `<span class="ffString__emptyValue">${NULL_LABEL}</span>`
      );
    });
  });

  describe('present values', () => {
    test('returns undefined for valid values', () => {
      expect(checkForMissingValueHtml('valid value')).toBeUndefined();
      expect(checkForMissingValueHtml('0')).toBeUndefined();
      expect(checkForMissingValueHtml(0)).toBeUndefined();
      expect(checkForMissingValueHtml(false)).toBeUndefined();
      expect(checkForMissingValueHtml([])).toBeUndefined();
      expect(checkForMissingValueHtml({})).toBeUndefined();
    });

    test('returns undefined for whitespace-only strings', () => {
      expect(checkForMissingValueHtml(' ')).toBeUndefined();
      expect(checkForMissingValueHtml('\t')).toBeUndefined();
      expect(checkForMissingValueHtml('\n')).toBeUndefined();
    });
  });
});
