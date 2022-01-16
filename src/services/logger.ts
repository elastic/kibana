import dedent from 'dedent';
import { isString } from 'lodash';
import safeJsonStringify from 'safe-json-stringify';
import winston, { format } from 'winston';
import { ConfigFileOptions } from '../options/ConfigOptions';
import { redact } from '../utils/redact';
import { getLogfilePath } from './env';

const { combine } = format;

let winstonInstance: winston.Logger;

// wrapper around console.log
export function consoleLog(message: string) {
  // eslint-disable-next-line no-console
  console.log(redactAccessToken(message));
  //process.stdout.write(message);
}

export type Logger = typeof logger;

export const logger = {
  error: (message: string, meta?: unknown) => {
    winstonInstance.error(message, null, { meta });
  },
  warn: (message: string, meta?: unknown) => {
    winstonInstance.warn(message, null, { meta });
  },
  info: (message: string, meta?: unknown) => {
    winstonInstance.info(message, null, { meta });
  },
  verbose: (message: string, meta?: unknown) => {
    winstonInstance.verbose(message, null, { meta });
  },
  debug: (message: string, meta?: unknown) => {
    winstonInstance.debug(message, null, { meta });
  },
};

let accessToken: string | undefined;

export function updateLogger(options: ConfigFileOptions) {
  accessToken = options.accessToken;

  // set log level
  winstonInstance.level = options.verbose ? 'debug' : 'info';
}

function redactAccessToken(str: string) {
  // `redactAccessToken` might be called before access token is set
  if (accessToken) {
    return redact(accessToken, str);
  }

  return str;
}

export function initLogger({
  ci,
  logFilePath,
}: {
  ci?: boolean;
  logFilePath?: string;
}) {
  const fileTransport = getFileTransport({ logFilePath });

  winstonInstance = winston.createLogger({
    transports: ci
      ? [fileTransport, new winston.transports.Console()]
      : [fileTransport],
  });

  // wait exiting until logs have been flushed to disk
  winstonInstance.on('finish', () => {
    process.exit(1);
  });

  return logger;
}

function getFileTransport({ logFilePath }: { logFilePath?: string }) {
  return new winston.transports.File({
    level: 'debug',
    format: combine(
      format.splat(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'label'],
      }),

      format.printf((info) => {
        // format without metadata
        if (!info.metadata.meta) {
          return redactAccessToken(`${info.timestamp}: ${info.message}`);
        }

        // format when metadata is a string
        if (isString(info.metadata.meta)) {
          return redactAccessToken(
            `${info.timestamp}: ${info.message}\n${dedent(
              info.metadata.meta
            )}\n`
          );
        }

        if (info.metadata.meta.stack) {
          return redactAccessToken(
            `${info.timestamp}: ${info.message}\n${info.metadata.meta.stack}\n`
          );
        }

        // format when metadata is an object

        return redactAccessToken(
          `${info.timestamp}: ${info.message}\n${safeJsonStringify(
            info.metadata.meta,
            null,
            2
          )}\n`
        );
      })
    ),
    filename: getLogfilePath({ logFilePath }),
  });
}

// log levels:
// - error
// - warn
// - info
// - verbose
// - debug
