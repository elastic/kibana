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
import { Minimatch } from 'minimatch';

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
export const tapFileStream = (
  fn: (file: BufferedFile) => File | void | null | Promise<File | void | null>
) =>
  new Transform({
    objectMode: true,
    transform(file: BufferedFile, _, cb) {
      Promise.resolve(file)
        .then(fn)
        .then(
          (result) => {
            // drop the file when null is returned
            if (result === null) {
              cb();
            } else {
              cb(undefined, result || file);
            }
          },
          (error) => cb(error)
        );
    },
  });

export const excludeFiles = (globs: string[]) => {
  const patterns = globs.map(
    (g) =>
      new Minimatch(g, {
        matchBase: true,
      })
  );

  return tapFileStream((file) => {
    const path = file.relative.replace(/\.ejs$/, '');
    const exclude = patterns.some((p) => p.match(path));
    if (exclude) {
      return null;
    }
  });
};
