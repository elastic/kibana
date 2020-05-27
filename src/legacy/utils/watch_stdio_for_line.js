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

import { createPromiseFromStreams, createSplitStream, createMapStream } from './streams';

// creates a stream that skips empty lines unless they are followed by
// another line, preventing the empty lines produced by splitStream
function skipLastEmptyLineStream() {
  let skippedEmptyLine = false;
  return new Transform({
    objectMode: true,
    transform(line, enc, cb) {
      if (skippedEmptyLine) {
        this.push('');
        skippedEmptyLine = false;
      }

      if (line === '') {
        skippedEmptyLine = true;
        return cb();
      } else {
        return cb(null, line);
      }
    },
  });
}

export async function watchStdioForLine(proc, logFn, exitAfter) {
  function onLogLine(line) {
    logFn(line);

    if (exitAfter && exitAfter.test(line)) {
      proc.kill('SIGINT');
    }
  }

  await Promise.all([
    proc.catch((error) => {
      // ignore the error thrown by execa if it's because we killed with SIGINT
      if (error.signal !== 'SIGINT') {
        throw error;
      }
    }),
    createPromiseFromStreams([
      proc.stdout,
      createSplitStream('\n'),
      skipLastEmptyLineStream(),
      createMapStream(onLogLine),
    ]),
    createPromiseFromStreams([
      proc.stderr,
      createSplitStream('\n'),
      skipLastEmptyLineStream(),
      createMapStream(onLogLine),
    ]),
  ]);
}
