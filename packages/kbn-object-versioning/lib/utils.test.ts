/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateVersion } from './utils';

describe('utils', () => {
  describe('validateVersion()', () => {
    [
      { input: '123', isValid: true, expected: 123 },
      { input: '1111111111111111111111111', isValid: true, expected: 1111111111111111111111111 },
      { input: '111111111111.1111111111111', isValid: false, expected: null },
      { input: 123, isValid: true, expected: 123 },
      { input: 1.23, isValid: false, expected: null },
      { input: '123a', isValid: false, expected: null },
      { input: 'abc', isValid: false, expected: null },
      { input: undefined, isValid: false, expected: null },
      { input: null, isValid: false, expected: null },
      { input: [123], isValid: false, expected: null },
      { input: { 123: true }, isValid: false, expected: null },
      { input: () => 123, isValid: false, expected: null },
    ].forEach(({ input, expected, isValid }) => {
      test(`validate: [${input}]`, () => {
        const { result, value } = validateVersion(input);
        expect(result).toBe(isValid);
        expect(value).toBe(expected);
      });
    });
  });
});
