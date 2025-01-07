/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FileHashCache } from './file_hash_cache';

describe('FileHashCache', () => {
  it('returns the value stored', async () => {
    const cache = new FileHashCache();
    cache.set('foo', Promise.resolve('bar'));
    expect(await cache.get('foo')).toEqual('bar');
  });

  it('can manually delete values', () => {
    const cache = new FileHashCache();
    cache.set('foo', Promise.resolve('bar'));
    cache.del('foo');
    expect(cache.get('foo')).toBeUndefined();
  });

  it('only preserves a given amount of entries', async () => {
    const cache = new FileHashCache(1);
    cache.set('foo', Promise.resolve('bar'));
    cache.set('hello', Promise.resolve('dolly'));

    expect(await cache.get('hello')).toEqual('dolly');
    expect(cache.get('foo')).toBeUndefined();
  });
});
