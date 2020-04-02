import winston, { format } from 'winston';
import yargs from 'yargs';
import { getLogfilePath } from './env';
import safeJsonStringify from 'safe-json-stringify';
import isString from 'lodash.isstring';
import dedent from 'dedent';

const { combine } = format;
const { argv } = yargs.help(false);

// wrapper around console.log
export function consoleLog(...args: unknown[]) {
  console.log(...args);
}

const level = argv.verbose ? 'verbose' : argv.debug ? 'debug' : 'info';

let winstonInstance: winston.Logger;

export const logger = {
  info: (message: string, meta?: unknown) => {
    if (winstonInstance) {
      winstonInstance.info(message, { meta });
    }
  },
  verbose: (message: string, meta?: unknown) => {
    if (winstonInstance) {
      winstonInstance.verbose(message, { meta });
    }
  },
  debug: (message: string, meta?: unknown) => {
    if (winstonInstance) {
      winstonInstance.debug(message, { meta });
    }
  },
};

export function initLogger() {
  winstonInstance = winston.createLogger({
    transports: [
      // log to file
      new winston.transports.File({
        level,
        format: combine(
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.metadata({
            fillExcept: ['message', 'level', 'timestamp', 'label'],
          }),

          format.printf((info) => {
            if (!info.metadata.meta) {
              return `${info.timestamp}: ${info.message}`;
            }

            if (isString(info.metadata.meta)) {
              return `${info.timestamp} ${info.message}\n${dedent(
                info.metadata.meta
              )}\n`;
            }

            return `${info.timestamp} ${info.message}\n${safeJsonStringify(
              info.metadata.meta,
              null,
              2
            )}\n`;
          })
        ),
        filename: getLogfilePath(),
      }),
    ],
  });
  return winstonInstance;
}

// log levels:
// - error
// - warn
// - info
// - verbose
// - debug
