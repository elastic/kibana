/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger, LogLevel } from './create_logger';

function isPromise(val: any): val is Promise<any> {
  return val && typeof val === 'object' && 'then' in val && typeof val.then === 'function';
}

function logTo(logger: Logger, name: string, start: bigint) {
  logger.debug(`${name}: ${Number(process.hrtime.bigint() - start) / 1000000}ms`);
}

export const logPerf = <T extends any>(
  logger: Logger,
  logLevel: LogLevel,
  name: string,
  cb: () => T
): T => {
  if (logLevel <= LogLevel.trace) {
    const start = process.hrtime.bigint();
    const val = cb();
    if (isPromise(val)) {
      val.finally(() => {
        logTo(logger, name, start);
      });
    } else {
      logTo(logger, name, start);
    }
    return val;
  }
  return cb();
};
