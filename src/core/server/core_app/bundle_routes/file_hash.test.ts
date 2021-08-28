/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { generateFileHashMock, getFileCacheKeyMock } from './file_hash.test.mocks';

import { resolve } from 'path';
import { Stats } from 'fs';
import { getFileHash } from './file_hash';
import { IFileHashCache } from './file_hash_cache';

const mockedCache = (): jest.Mocked<IFileHashCache> => ({
  del: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
});

describe('getFileHash', () => {
  const sampleFilePath = resolve(__dirname, 'foo.js');
  const fd = 42;
  const stats: Stats = { ino: 42, size: 9000 } as any;

  beforeEach(() => {
    getFileCacheKeyMock.mockImplementation((path: string, stat: Stats) => `${path}-${stat.ino}`);
  });

  afterEach(() => {
    generateFileHashMock.mockReset();
    getFileCacheKeyMock.mockReset();
  });

  it('returns the value from cache if present', async () => {
    const cache = mockedCache();
    cache.get.mockReturnValue(Promise.resolve('cached-hash'));

    const hash = await getFileHash(cache, sampleFilePath, stats, fd);

    expect(cache.get).toHaveBeenCalledTimes(1);
    expect(generateFileHashMock).not.toHaveBeenCalled();
    expect(hash).toEqual('cached-hash');
  });

  it('computes the value if not present in cache', async () => {
    const cache = mockedCache();
    cache.get.mockReturnValue(undefined);

    generateFileHashMock.mockReturnValue(Promise.resolve('computed-hash'));

    const hash = await getFileHash(cache, sampleFilePath, stats, fd);

    expect(generateFileHashMock).toHaveBeenCalledTimes(1);
    expect(generateFileHashMock).toHaveBeenCalledWith(fd);
    expect(hash).toEqual('computed-hash');
  });

  it('sets the value in the cache if not present', async () => {
    const computedHashPromise = Promise.resolve('computed-hash');
    generateFileHashMock.mockReturnValue(computedHashPromise);

    const cache = mockedCache();
    cache.get.mockReturnValue(undefined);

    await getFileHash(cache, sampleFilePath, stats, fd);

    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith(`${sampleFilePath}-${stats.ino}`, expect.any(Promise));
    const promiseValue = await cache.set.mock.calls[0][1];
    expect(promiseValue).toEqual('computed-hash');
  });
});
