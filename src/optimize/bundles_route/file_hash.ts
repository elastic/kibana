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
