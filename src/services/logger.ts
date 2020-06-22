import dedent from 'dedent';
import isString from 'lodash.isstring';
import safeJsonStringify from 'safe-json-stringify';
import winston, { format } from 'winston';
import yargs from 'yargs';
import { getLogfilePath } from './env';

const { combine } = format;

// wrapper around console.log
export function consoleLog(message: string) {
  // eslint-disable-next-line no-console
  console.log(message);
  //process.stdout.write(message);
}

const { argv } = yargs.help(false);
export const logLevel = argv.verbose
  ? 'verbose'
  : argv.debug
  ? 'debug'
  : 'info';

let winstonInstance: winston.Logger;

export type Logger = typeof logger;
export const logger = {
  info: (message: string, meta?: string | Record<string, unknown>) => {
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

function createRedactor(accessToken?: string) {
  return (str: string) => {
    if (!accessToken) {
      return str;
    }
    return str.replace(new RegExp(accessToken, 'g'), '<REDACTED>');
  };
}

export function initLogger(accessToken?: string) {
  const redact = createRedactor(accessToken);

  winstonInstance = winston.createLogger({
    transports: [
      // log to file
      new winston.transports.File({
        level: logLevel,
        format: combine(
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.metadata({
            fillExcept: ['message', 'level', 'timestamp', 'label'],
          }),

          format.printf((info) => {
            // format without metadata
            if (!info.metadata.meta) {
              return redact(`${info.timestamp}: ${info.message}`);
            }

            // format when metadata is a string
            if (isString(info.metadata.meta)) {
              return redact(
                `${info.timestamp}: ${info.message}\n${dedent(
                  info.metadata.meta
                )}\n`
              );
            }

            // format when metadata is an object
            return redact(
              `${info.timestamp}: ${info.message}\n${safeJsonStringify(
                info.metadata.meta,
                null,
                2
              )}\n`
            );
          })
        ),
        filename: getLogfilePath(),
      }),
    ],
  });

  // wait exiting until logs have been flushed to disk
  winstonInstance.on('finish', () => {
    process.exit(1);
  });

  return winstonInstance;
}

// log levels:
// - error
// - warn
// - info
// - verbose
// - debug
