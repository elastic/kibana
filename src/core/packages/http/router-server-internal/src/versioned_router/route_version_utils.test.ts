/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { hapiMocks } from '@kbn/hapi-mocks';
import { CoreKibanaRequest } from '../request';
import { passThroughValidation } from './core_versioned_route';
import {
  isValidRouteVersion,
  isAllowedPublicVersion,
  readVersion,
  removeQueryVersion,
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

describe('readVersion', () => {
  test('reads the version header', () => {
    const req = getRequest({ headers: { 'elastic-api-version': '1' } });
    expect(readVersion(req)).toBe('1');
  });
  test('reads query version when enabled', () => {
    const req = getRequest({ headers: {}, query: { apiVersion: '1' } });
    expect(readVersion(req, true)).toBe('1');
  });
  test('returns undefined when no version is specified', () => {
    const req = getRequest();
    expect(readVersion(req, true)).toBe(undefined);
  });
  test('header version takes precedence over query param version', () => {
    const req = getRequest({ headers: { 'elastic-api-version': '3' }, query: { apiVersion: '2' } });
    expect(readVersion(req, true)).toBe('3');
  });
});

describe('removeQueryVersion', () => {
  it('removes the apiVersion query param by mutation', () => {
    const req = getRequest({
      headers: { foo: 'bar' },
      query: { apiVersion: '1', baz: 'qux' },
    });
    expect(readVersion(req, true)).toBe('1');
    removeQueryVersion(req as any);
    expect(readVersion(req, true)).toBe(undefined);
    expect(req.query).toEqual({ baz: 'qux' });
    expect(req.headers).toEqual({ foo: 'bar' });
  });
});
