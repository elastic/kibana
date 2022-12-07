/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parentPort, isMainThread } from 'worker_threads';
import { createLogger, Logger, LogLevel } from '../../lib/utils/create_logger';

// logging proxy to main thread, ensures we see real time logging
export const loggerProxy: Logger = isMainThread
  ? createLogger(LogLevel.trace)
  : {
      perf: <T extends any>(name: string, cb: () => T): T => {
        return cb();
      },
      debug: (...args: any[]) => parentPort?.postMessage({ log: LogLevel.debug, args }),
      info: (...args: any[]) => parentPort?.postMessage({ log: LogLevel.info, args }),
      error: (...args: any[]) => parentPort?.postMessage({ log: LogLevel.error, args }),
    };
