import winston, { format } from 'winston';
import { redact } from '../utils/redact';
import { getLogfilePath } from './env';

export let logger: winston.Logger;

// wrapper around console.log
export function consoleLog(message: string) {
  // eslint-disable-next-line no-console
  console.log(redactAccessToken(message));
  //process.stdout.write(message);
}

let _accessToken: string | undefined;

export function updateLogger({
  accessToken,
  verbose,
}: {
  accessToken: string;
  verbose?: boolean;
}) {
  // set access token
  _accessToken = accessToken;

  // set log level
  logger.level = verbose ? 'debug' : 'info';
}

function redactAccessToken(str: string) {
  // `redactAccessToken` might be called before access token is set
  if (_accessToken) {
    return redact(_accessToken, str);
  }

  return str;
}

export function initLogger({
  ci,
  accessToken,
  logFilePath,
}: {
  ci?: boolean;
  accessToken?: string;
  logFilePath?: string;
}) {
  const fileTransport = getFileTransport({ logFilePath });

  if (accessToken) {
    _accessToken = accessToken;
  }

  logger = winston.createLogger({
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      // Format the metadata object
      format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'label'],
      })
    ),
    transports: ci
      ? [fileTransport, new winston.transports.Console()]
      : [fileTransport],
  });

  return logger;
}

function getFileTransport({ logFilePath }: { logFilePath?: string }) {
  return new winston.transports.File({
    filename: getLogfilePath({ logFilePath }),
    level: 'debug',
    format: format.combine(format.json()),
  });
}

// log levels:
// - error
// - warn
// - info
// - verbose
// - debug
