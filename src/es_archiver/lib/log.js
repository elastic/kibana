import { format } from 'util';
import { magenta, yellow, red, blue, brightBlack } from 'ansicolors';

export function createLog(logLevel, output) {
  function write(...args) {
    format(...args).split('\n').forEach((line, i) => {
      output.write(`${i === 0 ? '' : '    '}${line}\n`);
    });
  }

  class Log {
    debug = (...args) => {
      if (logLevel < 3) return;
      write(' %s ', brightBlack('debg'), format(...args));
    }

    info = (...args) => {
      if (logLevel < 2) return;
      write(' %s ', blue('info'), format(...args));
    }

    error = (err) => {
      if (logLevel < 1) return;

      if (typeof err !== 'string' && !(err instanceof Error)) {
        err = new Error(`"${err}" thrown`);
      }

      write('%s ', red('ERROR'), err.stack || err.message || err);
    }
  }

  return new Log();
}
