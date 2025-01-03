/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidVariableName } from './utils';

describe('utils', () => {
  describe('isValidVariableName', () => {
    it('returns `false` to `null`', () => {
      // @ts-ignore passing a wrong type intentionally
      expect(isValidVariableName(null)).toBe(false);
    });

    it('returns `false` to empty string', () => {
      expect(isValidVariableName('')).toBe(false);
    });

    it('returns `false` to space string', () => {
      expect(isValidVariableName(' ')).toBe(false);
    });

    it('returns `false` to integer zero', () => {
      // @ts-ignore passing a wrong type intentionally
      expect(isValidVariableName(0)).toBe(false);
    });

    it('returns `false` to float zero', () => {
      // @ts-ignore passing a wrong type intentionally
      expect(isValidVariableName(0.0)).toBe(false);
    });

    it('returns `true` to string zero', () => {
      expect(isValidVariableName('0')).toBe(true);
    });

    it('returns `true` to allowed styles', () => {
      for (const name of ['camelCase', 'snake_case', 'PascalCase', 'MACRO_CASE']) {
        expect(isValidVariableName(name)).toBe(true);
      }
    });

    it('returns `false` to disallowed styles', () => {
      for (const name of ['kebab-case', 'COBOL-CASE', 'dot.notation', 'bracket[notation]']) {
        expect(isValidVariableName(name)).toBe(false);
      }
    });

    it('returns `true` to underscores prefix & suffix', () => {
      expect(isValidVariableName('__name__')).toBe(true);
    });

    it('returns `true` to numbers prefix & suffix', () => {
      expect(isValidVariableName('00name00')).toBe(true);
    });
  });
});
