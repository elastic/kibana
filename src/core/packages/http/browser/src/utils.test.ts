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

  it('adds optional path segments when the parameter is present', () => {
    expect(buildPath('/api/myapi/{section}/{id?}', { section: 'test', id: 'tada' })).toBe(
      '/api/myapi/test/tada'
    );
  });

  it('removes optional path segments when the parameter is missing', () => {
    expect(buildPath('/api/myapi/{section}/{id?}', { section: 'test' })).toBe('/api/myapi/test');
  });

  it('removes optional path segments when the parameter is undefined', () => {
    const params: { section: string; id: string | undefined } = {
      section: 'test',
      id: undefined,
    };

    expect(buildPath('/api/myapi/{section}/{id?}', params)).toBe('/api/myapi/test');
  });

  it('encodes multi-segment path parameters', () => {
    expect(
      buildPath('/api/myapi/{filePath*}', {
        filePath: 'nested/folder/my file.txt',
      })
    ).toBe('/api/myapi/nested/folder/my%20file.txt');
  });

  it('encodes counted multi-segment path parameters from arrays', () => {
    expect(
      buildPath('/api/myapi/{coordinates*2}', {
        coordinates: ['north east', 'south/west'],
      })
    ).toBe('/api/myapi/north%20east/south%2Fwest');
  });

  it('throws when a counted multi-segment path parameter has the wrong number of segments', () => {
    expect(() => buildPath('/api/myapi/{coordinates*2}', { coordinates: 'only-one' })).toThrow(
      'Expected 2 path segment(s) for parameter: coordinates, received 1'
    );
  });

  it('throws when unsupported path template syntax remains unresolved', () => {
    expect(() => buildPath('/api/myapi/{filePath?*}', { filePath: 'nested/file.txt' })).toThrow(
      'Unsupported path template syntax: {filePath?*}'
    );
  });

  it('throws when a required path parameter is missing', () => {
    expect(() => buildPath('/api/dashboards/{id}', {})).toThrow(
      'Missing required path parameter: id'
    );
  });
});
