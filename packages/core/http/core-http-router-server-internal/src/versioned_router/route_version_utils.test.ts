/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  isValidRouteVersion,
  isAllowedPublicVersion,
  hasVersion,
  readVersion,
} from './route_version_utils';

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

describe('hasVersion', () => {
  test('detects the version header', () => {
    expect(hasVersion({ headers: { 'elastic-api-version': '1' } } as any)).toBe(true);
    expect(hasVersion({ headers: {} } as any)).toBe(false);
  });
  test('detects query version, when enabled', () => {
    expect(hasVersion({ headers: {}, query: { apiVersion: '1' } } as any, true)).toBe(true);
    expect(hasVersion({ headers: {} } as any, false)).toBe(false);
  });
  test('returns true when both are present', () => {
    expect(
      hasVersion({ headers: { 'elastic-api-version': 1 }, query: { apiVersion: '2' } } as any, true)
    ).toBe(true);
  });
});

describe('readVersion', () => {
  test('reads the version header', () => {
    expect(readVersion({ headers: { 'elastic-api-version': '1' } } as any)).toBe('1');
    expect(readVersion({ headers: {} } as any)).toBe(undefined);
  });
  test('reads query version when enabled', () => {
    expect(readVersion({ headers: {}, query: { apiVersion: '1' } } as any, true)).toBe('1');
    expect(readVersion({ headers: {} } as any, false)).toBe(undefined);
  });
  test('header version takes precedence', () => {
    expect(
      readVersion(
        { headers: { 'elastic-api-version': '3' }, query: { apiVersion: '2' } } as any,
        true
      )
    ).toBe('3');
  });
});
