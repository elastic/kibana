/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { splitKey, getUnsplittableKey } from './utils';

describe('splitKey', () => {
  it('correctly splits on the dot delimiter', () => {
    expect(splitKey('hello')).toEqual(['hello']);
    expect(splitKey('hello.dolly')).toEqual(['hello', 'dolly']);
    expect(splitKey('foo.bar.lala')).toEqual(['foo', 'bar', 'lala']);
  });

  it('identifies the unsplittable key pattern', () => {
    expect(splitKey('[hello]')).toEqual(['hello']);
    expect(splitKey('[foo.bar]')).toEqual(['foo.bar']);
  });
});

describe('getUnsplittableKey', () => {
  it('returns the correct key when matching', () => {
    expect(getUnsplittableKey('[hello]')).toEqual('hello');
    expect(getUnsplittableKey('[foo.bar]')).toEqual('foo.bar');
  });

  it('returns undefined when not matching', () => {
    expect(getUnsplittableKey('[foo.bar')).toEqual(undefined);
    expect(getUnsplittableKey('foo.bar]')).toEqual(undefined);
    expect(getUnsplittableKey('foo.bar')).toEqual(undefined);
  });
});
