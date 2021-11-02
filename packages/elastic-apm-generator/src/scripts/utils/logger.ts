/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export enum LogLevel {
  debug = 0,
  info = 1,
  quiet = 2,
}

export function createLogger(logLevel: LogLevel) {
  return {
    debug: (...args: any[]) => {
      if (logLevel <= LogLevel.debug) {
        // eslint-disable-next-line no-console
        console.debug(...args);
      }
    },
    info: (...args: any[]) => {
      if (logLevel <= LogLevel.info) {
        // eslint-disable-next-line no-console
        console.log(...args);
      }
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
