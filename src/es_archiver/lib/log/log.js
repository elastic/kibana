import { format } from 'util';
import { PassThrough } from 'stream';

import { createLogLevelFlags } from './log_levels';
import { magenta, yellow, red, blue, brightBlack } from 'ansicolors';

export function createLog(logLevel = 'silent') {
  const logLevelFlags = createLogLevelFlags(logLevel);

  function write(stream, ...args) {
    format(...args).split('\n').forEach((line, i) => {
      stream.write(`${i === 0 ? '' : '    '}${line}\n`);
    });
  }

  class Log extends PassThrough {
    debug(...args) {
      if (!logLevelFlags.debug) return;
      write(this, ' %s ', brightBlack('debg'), format(...args));
    }

    info(...args) {
      if (!logLevelFlags.info) return;
      write(this, ' %s ', blue('info'), format(...args));
    }

    error(err) {
      if (!logLevelFlags.error) return;

      if (typeof err !== 'string' && !(err instanceof Error)) {
        err = new Error(`"${err}" thrown`);
      }

      write(this, '%s ', red('ERROR'), err.stack || err.message || err);
    }
  }

  return new Log();
}
