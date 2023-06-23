/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { KibanaRequest } from '@kbn/core-http-server';
import { hapiMocks } from '@kbn/hapi-mocks';
import { CoreKibanaRequest } from '../request';
import { passThroughValidation } from './core_versioned_route';
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

function getRequest(arg: { headers?: any; query?: any } = {}): KibanaRequest {
  const request = hapiMocks.createRequest({ ...arg });
  return CoreKibanaRequest.from(request, passThroughValidation);
}

describe('hasVersion', () => {
  test('detects the version header', () => {
    {
      const req = getRequest({ headers: { 'elastic-api-version': '1' } });
      expect(hasVersion(req)).toBe(true);
    }
    {
      const req = getRequest();
      expect(hasVersion(req)).toBe(false);
    }
  });

  test('detects query version, when enabled', () => {
    {
      const req = getRequest({ headers: {}, query: { apiVersion: '1' } });
      expect(hasVersion(req, true)).toBe(true);
    }
    {
      const req = getRequest();
      expect(hasVersion(req, true)).toBe(false);
    }
  });
  test('returns true when both are present', () => {
    const req = getRequest({ headers: { 'elastic-api-version': 1 }, query: { apiVersion: '2' } });
    expect(hasVersion(req, true)).toBe(true);
  });
});

describe('readVersion', () => {
  test('reads the version header', () => {
    {
      const req = getRequest({ headers: { 'elastic-api-version': '1' } });
      expect(readVersion(req)).toBe('1');
    }
    {
      const req = getRequest({ headers: {} });
      expect(readVersion(req)).toBe(undefined);
    }
  });
  test('reads query version when enabled', () => {
    {
      const req = getRequest({ headers: {}, query: { apiVersion: '1' } });
      expect(readVersion(req, true)).toBe('1');
    }
    {
      const req = getRequest({ headers: {} });
      expect(readVersion(req, false)).toBe(undefined);
    }
  });
  test('header version takes precedence over query param version', () => {
    const req = getRequest({ headers: { 'elastic-api-version': '3' }, query: { apiVersion: '2' } });
    expect(readVersion(req, true)).toBe('3');
  });
});
