/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import util from 'util';
import { parentPort, isMainThread, workerData } from 'worker_threads';
import { createLogger, Logger, LogLevel } from '../../lib/utils/create_logger';
import { logPerf } from '../../lib/utils/log_perf';
import { WorkerData } from './synthtrace_worker';

const { workerId } = isMainThread ? { workerId: -1 } : (workerData as WorkerData);

function getLogMethod(log: LogLevel) {
  return (...args: any) => {
    parentPort?.postMessage({
      log,
      args: [`[${workerId}]`].concat(
        args.map((arg: any) =>
          typeof arg === 'string' || typeof arg === 'number'
            ? arg
            : util.inspect(arg, { depth: 10 })
        )
      ),
    });
  };
}

// logging proxy to main thread, ensures we see real time logging
export const loggerProxy: Logger = isMainThread
  ? createLogger(LogLevel.trace)
  : {
      perf: <T extends any>(name: string, cb: () => T): T => {
        return logPerf(loggerProxy, LogLevel.trace, name, cb);
      },
      debug: getLogMethod(LogLevel.debug),
      info: getLogMethod(LogLevel.info),
      error: getLogMethod(LogLevel.error),
    };
