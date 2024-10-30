/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Transform } from 'stream';

import File from 'vinyl';

interface BufferedFile extends File {
  contents: Buffer;
  isDirectory(): false;
}

/**
 * Create a transform stream that processes Vinyl fs streams and
 * calls a function for each file, allowing the function to either
 * mutate the file, replace it with another file (return a new File
 * object), or drop it from the stream (return null)
 */
export const transformFileStream = (
  fn: (file: BufferedFile) => File | void | null | Promise<File | void | null>
) =>
  new Transform({
    objectMode: true,
    transform(file: File, _, cb) {
      Promise.resolve()
        .then(async () => {
          if (file.isDirectory()) {
            return cb(undefined, file);
          }

          if (!(file.contents instanceof Buffer)) {
            throw new Error('files must be buffered to use transformFileStream()');
          }

          const result = await fn(file as BufferedFile);

          if (result === null) {
            // explicitly drop file if null is returned
            cb();
          } else {
            cb(undefined, result || file);
          }
        })
        .catch(cb);
    },
  });
