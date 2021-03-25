/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LoggerFactory, Logger } from '@kbn/logging';
import { Log } from './log';

export const convertToLoggerFactory = (cliLog: Log): LoggerFactory => {
  const adapted = convertToLogger(cliLog);
  return {
    get: () => adapted,
  };
};

export const convertToLogger = (cliLog: Log): Logger => {
  const getErrorMessage = (msgOrError: string | Error): string => {
    return typeof msgOrError === 'string' ? msgOrError : msgOrError.message;
  };

  const adapter: Logger = {
    trace: (message) => cliLog.good(message),
    debug: (message) => cliLog.good(message),
    info: (message) => cliLog.good(message),
    warn: (msgOrError) => cliLog.warn(getErrorMessage(msgOrError)),
    error: (msgOrError) => cliLog.bad(getErrorMessage(msgOrError)),
    fatal: (msgOrError) => cliLog.bad(getErrorMessage(msgOrError)),
    log: (record) => cliLog.good(record.message),
    get: () => adapter,
  };
  return adapter;
};
