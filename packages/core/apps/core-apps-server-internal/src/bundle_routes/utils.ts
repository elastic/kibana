/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createReadStream, Stats } from 'fs';
import { createHash } from 'crypto';
import * as Rx from 'rxjs';
import { map, takeUntil } from 'rxjs';

export const generateFileHash = (fd: number): Promise<string> => {
  const hash = createHash('sha1');
  const read = createReadStream(null as any, {
    fd,
    start: 0,
    autoClose: false,
  });
  return Rx.merge(
    Rx.fromEvent<Buffer>(read, 'data'),
    Rx.fromEvent<Error>(read, 'error').pipe(
      map((error) => {
        throw error;
      })
    )
  )
    .pipe(takeUntil(Rx.fromEvent(read, 'end')))
    .forEach((chunk) => hash.update(chunk))
    .then(() => hash.digest('hex'));
};

export const getFileCacheKey = (path: string, stat: Stats) =>
  `${path}:${stat.ino}:${stat.size}:${stat.mtime.getTime()}`;
