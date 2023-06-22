/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { logPerf } from './log_perf';

export enum LogLevel {
  trace = 0,
  debug = 1,
  info = 2,
  error = 3,
}

function getTimeString() {
  return `[${new Date().toLocaleTimeString()}]`;
}

export function createLogger(logLevel: LogLevel) {
  const logger: Logger = {
    perf: (name, callback) => {
      return logPerf(logger, logLevel, name, callback);
    },
    debug: (...args: any[]) => {
      if (logLevel <= LogLevel.debug) {
        // eslint-disable-next-line no-console
        console.debug(getTimeString(), ...args);
      }
    },
    info: (...args: any[]) => {
      if (logLevel <= LogLevel.info) {
        // eslint-disable-next-line no-console
        console.log(getTimeString(), ...args);
      }
    },
    error: (...args: any[]) => {
      if (logLevel <= LogLevel.error) {
        // eslint-disable-next-line no-console
        console.log(getTimeString(), ...args);
      }
    },
  };

  return logger;
}

export interface Logger {
  perf: <T>(name: string, cb: () => T) => T;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  error: (...args: any[]) => void;
}
