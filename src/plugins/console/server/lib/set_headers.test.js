/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { setHeaders } from './set_headers';

describe('#set_headers', function () {
  it('throws if not given an object as the first argument', function () {
    const fn = () => setHeaders(null, {});
    expect(fn).toThrow();
  });

  it('throws if not given an object as the second argument', function () {
    const fn = () => setHeaders({}, null);
    expect(fn).toThrow();
  });

  it('returns a new object', function () {
    const originalHeaders = {};
    const newHeaders = {};
    const returnedHeaders = setHeaders(originalHeaders, newHeaders);
    expect(returnedHeaders).not.toBe(originalHeaders);
    expect(returnedHeaders).not.toBe(newHeaders);
  });

  it('returns object with newHeaders merged with originalHeaders', function () {
    const originalHeaders = { foo: 'bar' };
    const newHeaders = { one: 'two' };
    const returnedHeaders = setHeaders(originalHeaders, newHeaders);
    expect(returnedHeaders).toEqual({ foo: 'bar', one: 'two' });
  });

  it('returns object where newHeaders takes precedence for any matching keys', function () {
    const originalHeaders = { foo: 'bar' };
    const newHeaders = { one: 'two', foo: 'notbar' };
    const returnedHeaders = setHeaders(originalHeaders, newHeaders);
    expect(returnedHeaders).toEqual({ foo: 'notbar', one: 'two' });
  });
});
