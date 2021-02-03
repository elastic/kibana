/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createHash } from 'crypto';
import Fs from 'fs';

import * as Rx from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

import { FileHashCache } from './file_hash_cache';

/**
 *  Get the hash of a file via a file descriptor
 */
export async function getFileHash(cache: FileHashCache, path: string, stat: Fs.Stats, fd: number) {
  const key = `${path}:${stat.ino}:${stat.size}:${stat.mtime.getTime()}`;

  const cached = cache.get(key);
  if (cached) {
    return await cached;
  }

  const hash = createHash('sha1');
  const read = Fs.createReadStream(null as any, {
    fd,
    start: 0,
    autoClose: false,
  });

  const promise = Rx.merge(
    Rx.fromEvent<Buffer>(read, 'data'),
    Rx.fromEvent<Error>(read, 'error').pipe(
      map((error) => {
        throw error;
      })
    )
  )
    .pipe(takeUntil(Rx.fromEvent(read, 'end')))
    .forEach((chunk) => hash.update(chunk))
    .then(() => hash.digest('hex'))
    .catch((error) => {
      // don't cache failed attempts
      cache.del(key);
      throw error;
    });

  cache.set(key, promise);
  return await promise;
}
