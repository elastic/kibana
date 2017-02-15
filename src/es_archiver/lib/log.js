import { format } from 'util';
import { magenta, yellow, red, blue, brightBlack } from 'ansicolors';

export function createLog(logLevel, output) {
  class Log {
    debug = (...args) => {
      if (logLevel < 3) return;
      this._write(' %s ', brightBlack('debg'), format(...args));
    }

    info = (...args) => {
      if (logLevel < 2) return;
      this._write(' %s ', blue('info'), format(...args));
    }

    error = (err) => {
      if (logLevel < 1) return;

      if (typeof err !== 'string' && !(err instanceof Error)) {
        err = new Error(`"${err}" thrown`);
      }

      this._write('%s ', red('ERROR'), err.stack || err.message || err);
    }

    _write(...args) {
      format(...args).split('\n').forEach((line, i) => {
        output.write(`${i === 0 ? '' : '    '}${line}\n`);
      });
    }
  }

  return new Log();
}
