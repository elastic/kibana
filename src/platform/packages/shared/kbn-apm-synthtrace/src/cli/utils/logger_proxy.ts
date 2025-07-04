/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parentPort, isMainThread, workerData } from 'worker_threads';
import { createLogger, Logger, LogLevel } from '../../lib/utils/create_logger';
import { BaseWorkerData } from './workers/types';

const { workerId } = isMainThread ? { workerId: -1 } : (workerData as BaseWorkerData);
// logging proxy to main thread, ensures we see real time logging
export const loggerProxy: Logger = isMainThread
  ? createLogger(LogLevel.verbose)
  : createLogger(LogLevel.verbose, {
      write: (msg) => {
        parentPort?.postMessage([msg.type, [`[${workerId}]`, msg.args[0]].join(' ')]);
        return true;
      },
    });
