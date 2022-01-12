/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

function isPromise(val: any): val is Promise<any> {
  return val && typeof val === 'object' && 'then' in val && typeof val.then === 'function';
}

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
  function logPerf(name: string, start: bigint) {
    // eslint-disable-next-line no-console
    console.debug(
      getTimeString(),
      `${name}: ${Number(process.hrtime.bigint() - start) / 1000000}ms`
    );
  }
  return {
    perf: <T extends any>(name: string, cb: () => T): T => {
      if (logLevel <= LogLevel.trace) {
        const start = process.hrtime.bigint();
        const val = cb();
        if (isPromise(val)) {
          val.then(() => {
            logPerf(name, start);
          });
        } else {
          logPerf(name, start);
        }
        return val;
      }
      return cb();
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
}

export type Logger = ReturnType<typeof createLogger>;
