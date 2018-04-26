import execa from 'execa';
import chalk from 'chalk';
import { Transform } from 'stream';

import {
  createPromiseFromStreams,
  createSplitStream,
  createMapStream,
} from '../../../utils';

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
    }
  });
}

export async function exec(log, cmd, args, options = {}) {
  const {
    level = 'debug',
    cwd,
    exitAfter,
  } = options;

  log[level](chalk.dim('$'), cmd, ...args);

  const proc = execa(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd,
  });

  function onLogLine(line) {
    log[level](line);

    if (exitAfter && exitAfter.test(line)) {
      proc.kill('SIGINT');
    }
  }

  await Promise.all([
    proc.catch(error => {
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
