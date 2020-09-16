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
