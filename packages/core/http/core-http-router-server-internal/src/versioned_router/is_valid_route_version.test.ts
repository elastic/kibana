/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isValidRouteVersion, isAllowedPublicVersion } from './is_valid_route_version';

describe('isAllowedPublicVersion', () => {
  test('allows 2023-10-31', () => {
    expect(isAllowedPublicVersion('2023-10-31')).toBe(undefined);
  });
  test('disallows non-"2023-10-31" strings', () => {
    expect(isAllowedPublicVersion('2020-01-01')).toMatch(/Invalid public version/);
    expect(isAllowedPublicVersion('foo')).toMatch(/Invalid public version/);
    expect(isAllowedPublicVersion('')).toMatch(/Invalid public version/);
  });
});

describe('isValidRouteVersion', () => {
  describe('public', () => {
    test('allows valid dates', () => {
      expect(isValidRouteVersion(true, '2010-02-01')).toBe(undefined);
    });
    test.each([['2020.02.01'], ['2020-99-99'], [''], ['abc']])(
      '%p returns an error message',
      (value: string) => {
        expect(isValidRouteVersion(true, value)).toMatch(/Invalid version/);
      }
    );
  });
  describe('internal', () => {
    test('allows valid numbers', () => {
      expect(isValidRouteVersion(false, '1234')).toBe(undefined);
    });

    test.each([
      ['1.1'],
      [''],
      ['abc'],
      ['2023-02-01'],
      ['2023.02.01'],
      ['2023 01 02'],
      ['0'],
      [' 11'],
      ['11 '],
      [' 11 '],
      ['-1'],
      ['010'],
    ])('%p returns an error message', (value: string) => {
      expect(isValidRouteVersion(false, value)).toMatch(/Invalid version number/);
    });
  });
});
