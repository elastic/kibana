/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildPath } from './utils';

describe('buildPath', () => {
  it('encodes required path parameters', () => {
    expect(
      buildPath('/api/myapi/{id}/{name?}', {
        id: '../../test',
      })
    ).toBe('/api/myapi/..%2F..%2Ftest');
  });

  it('encodes two required path parameters', () => {
    expect(
      buildPath('/api/myapi/{id}/{name}', {
        id: 'hello//',
        name: '//world',
      })
    ).toBe('/api/myapi/hello%2F%2F/%2F%2Fworld');
  });

  it('removes optional path segments when the parameter is present', () => {
    expect(buildPath('/api/myapi/{section}/{id?}', { section: 'test', id: 'tada' })).toBe(
      '/api/myapi/test/tada'
    );
  });

  it('removes optional path segments when the parameter is missing', () => {
    expect(buildPath('/api/myapi/{section}/{id?}', { section: 'test' })).toBe('/api/myapi/test');
  });

  it('throws when a required path parameter is missing', () => {
    expect(() => buildPath('/api/dashboards/{id}', {})).toThrow(
      'Missing required path parameter: id'
    );
  });
});
