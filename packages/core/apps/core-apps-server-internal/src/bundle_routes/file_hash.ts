/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Stats } from 'fs';
import { generateFileHash, getFileCacheKey } from './utils';
import type { IFileHashCache } from './file_hash_cache';

/**
 *  Get the hash of a file via a file descriptor
 */
export async function getFileHash(cache: IFileHashCache, path: string, stat: Stats, fd: number) {
  const key = getFileCacheKey(path, stat);

  const cached = cache.get(key);
  if (cached) {
    return await cached;
  }

  const promise = generateFileHash(fd).catch((error) => {
    // don't cache failed attempts
    cache.del(key);
    throw error;
  });

  cache.set(key, promise);
  return await promise;
}
