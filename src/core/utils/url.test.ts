/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { modifyUrl, isRelativeUrl } from './url';

describe('modifyUrl()', () => {
  test('throws an error with invalid input', () => {
    expect(() => modifyUrl(1 as any, () => ({}))).toThrowError();
    expect(() => modifyUrl(undefined as any, () => ({}))).toThrowError();
    expect(() => modifyUrl('http://localhost', undefined as any)).toThrowError();
  });

  test('supports returning a new url spec', () => {
    expect(modifyUrl('http://localhost', () => ({}))).toEqual('');
  });

  test('supports modifying the passed object', () => {
    expect(
      modifyUrl('http://localhost', (parsed) => {
        parsed.port = '9999';
        parsed.auth = 'foo:bar';
        return parsed;
      })
    ).toEqual('http://foo:bar@localhost:9999/');
  });

  test('supports changing pathname', () => {
    expect(
      modifyUrl('http://localhost/some/path', (parsed) => {
        parsed.pathname += '/subpath';
        return parsed;
      })
    ).toEqual('http://localhost/some/path/subpath');
  });

  test('supports changing port', () => {
    expect(
      modifyUrl('http://localhost:5601', (parsed) => {
        parsed.port = (Number(parsed.port!) + 1).toString();
        return parsed;
      })
    ).toEqual('http://localhost:5602/');
  });

  test('supports changing protocol', () => {
    expect(
      modifyUrl('http://localhost', (parsed) => {
        parsed.protocol = 'mail';
        parsed.slashes = false;
        parsed.pathname = null;
        return parsed;
      })
    ).toEqual('mail:localhost');
  });
});

describe('isRelativeUrl()', () => {
  test('returns "true" for a relative URL', () => {
    expect(isRelativeUrl('good')).toBe(true);
    expect(isRelativeUrl('/good')).toBe(true);
    expect(isRelativeUrl('/good/even/better')).toBe(true);
  });
  test('returns "false" for a non-relative URL', () => {
    expect(isRelativeUrl('http://evil.com')).toBe(false);
    expect(isRelativeUrl('//evil.com')).toBe(false);
    expect(isRelativeUrl('///evil.com')).toBe(false);
    expect(isRelativeUrl(' //evil.com')).toBe(false);
  });
});
