/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateVersion } from './utils';

describe('utils', () => {
  describe('validateVersion', () => {
    const isValid = (version: unknown): boolean => {
      try {
        validateVersion(version);
        return true;
      } catch (e) {
        return false;
      }
    };

    [
      {
        version: 'v1',
        expected: true,
      },
      {
        version: 'v689584563',
        expected: true,
      },
      {
        version: 'v0', // Invalid: must be >= 1
        expected: false,
      },
      {
        version: 'av0',
        expected: false,
      },
      {
        version: '1',
        expected: false,
      },
      {
        version: 'vv1',
        expected: false,
      },
    ].forEach(({ version, expected }) => {
      test(`should validate [${version}] version`, () => {
        expect(isValid(version)).toBe(expected);
      });
    });

    test('should return the version number', () => {
      expect(validateVersion('v7')).toBe(7);
    });
  });
});
