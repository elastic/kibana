/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parentPort, isMainThread, workerData } from 'worker_threads';
import { createLogger, Logger, LogLevel } from '../../lib/utils/create_logger';
import { WorkerData } from './synthtrace_worker';

const { workerId } = isMainThread ? { workerId: -1 } : (workerData as WorkerData);

function getLogMethod(log: LogLevel) {
  return (...args: any) => parentPort?.postMessage({ log, args: [`[${workerId}]`].concat(args) });
}

// logging proxy to main thread, ensures we see real time logging
export const loggerProxy: Logger = isMainThread
  ? createLogger(LogLevel.trace)
  : {
      perf: <T extends any>(name: string, cb: () => T): T => {
        return cb();
      },
      debug: getLogMethod(LogLevel.debug),
      info: getLogMethod(LogLevel.info),
      error: getLogMethod(LogLevel.error),
    };
