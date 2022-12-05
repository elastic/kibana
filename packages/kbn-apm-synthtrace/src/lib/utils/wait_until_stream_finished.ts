/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { promises } from 'stream';

export function awaitStream<T>(
  stream: NodeJS.ReadableStream | NodeJS.WritableStream | NodeJS.ReadWriteStream
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const data: T[] = [];

    stream.on('data', (chunk) => {
      data.push(chunk);
    });

    promises
      .finished(stream)
      .then(() => resolve(data))
      .catch(reject);
  });
}
