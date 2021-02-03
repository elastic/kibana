/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Transform } from 'stream';
import { ExecaChildProcess } from 'execa';

import { createPromiseFromStreams, createSplitStream, createMapStream } from '@kbn/utils';

// creates a stream that skips empty lines unless they are followed by
// another line, preventing the empty lines produced by splitStream
function skipLastEmptyLineStream() {
  let skippedEmptyLine = false;
  return new Transform({
    objectMode: true,
    transform(line, _, cb) {
      if (skippedEmptyLine) {
        this.push('');
        skippedEmptyLine = false;
      }

      if (line === '') {
        skippedEmptyLine = true;
        return cb();
      } else {
        return cb(undefined, line);
      }
    },
  });
}

export async function watchStdioForLine(
  proc: ExecaChildProcess,
  logFn: (line: string) => void,
  exitAfter?: RegExp
) {
  function onLogLine(line: string) {
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
      proc.stdout!, // TypeScript note: As long as the proc stdio[1] is 'pipe', then stdout will not be null
      createSplitStream('\n'),
      skipLastEmptyLineStream(),
      createMapStream(onLogLine),
    ]),
    createPromiseFromStreams([
      proc.stderr!, // TypeScript note: As long as the proc stdio[1] is 'pipe', then stderr will not be null
      createSplitStream('\n'),
      skipLastEmptyLineStream(),
      createMapStream(onLogLine),
    ]),
  ]);
}
