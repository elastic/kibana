import winston, { format } from 'winston';
import yargs from 'yargs';
import isString from 'lodash.isstring';
import { getLogfilePath } from './env';

const { combine, timestamp, printf } = format;
const { argv } = yargs.help(false);

// wrapper around console.log
export function consoleLog(...args: unknown[]) {
  console.log(...args);
}

const enabledVerboseLogging = argv.verbose || argv.v;

export let logger = ({
  info: () => {},
  verbose: () => {}
} as unknown) as winston.Logger;

export function initLogger() {
  logger = winston.createLogger({
    transports: [
      // log to file
      new winston.transports.File({
        level: enabledVerboseLogging ? 'verbose' : 'info',
        format: combine(
          timestamp(),
          printf(
            ({ message, timestamp }) => `${timestamp} ${formatMessage(message)}`
          )
        ),
        filename: getLogfilePath()
      })
    ]
  });
  return logger;
}

function formatMessage(message: string | Record<any, any>) {
  return isString(message) ? message : JSON.stringify(message, null, 2);
}

// log levels:
// - error
// - warn
// - info
// - verbose
// - debug
