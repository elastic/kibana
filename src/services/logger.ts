import dedent from 'dedent';
import isString from 'lodash.isstring';
import safeJsonStringify from 'safe-json-stringify';
import winston, { format } from 'winston';
import { getLogfilePath } from './env';

const { combine } = format;

let winstonInstance: winston.Logger;

// wrapper around console.log
export function consoleLog(message: string) {
  // eslint-disable-next-line no-console
  console.log(redact(message));
  //process.stdout.write(message);
}

export function setLogLevel({ verbose }: { verbose: boolean }) {
  winstonInstance.level = verbose ? 'verbose' : 'info';
}

export type Logger = typeof logger;
export const logger = {
  info: (message: string, meta?: string | Record<string, unknown>) => {
    winstonInstance.info(message, { meta });
  },
  verbose: (message: string, meta?: unknown) => {
    winstonInstance.verbose(message, { meta });
  },
  debug: (message: string, meta?: unknown) => {
    winstonInstance.debug(message, { meta });
  },
};

let redactedAccessToken: string | undefined;

export function setRedactedAccessToken(accessToken?: string) {
  redactedAccessToken = accessToken;
}

export function redact(str: string) {
  if (redactedAccessToken) {
    return str.replace(new RegExp(redactedAccessToken, 'g'), '<REDACTED>');
  }

  return str;
}

export function initLogger() {
  winstonInstance = winston.createLogger({
    transports: [
      // log to file
      new winston.transports.File({
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

  return logger;
}

// log levels:
// - error
// - warn
// - info
// - verbose
// - debug
