/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export enum LogLevelCoalescedValue {
  trace = 'trace',
  debug = 'debug',
  info = 'info',
  warning = 'warning',
  error = 'error',
  critical = 'critical',
  fatal = 'fatal',
}

export const getLogLevelCoalescedValue = (
  logLevel: string | string[] | unknown
): LogLevelCoalescedValue | undefined => {
  const logLevelUnfolded = Array.isArray(logLevel) ? logLevel[0] : logLevel;

  if (typeof logLevelUnfolded !== 'string') {
    return undefined;
  }

  const logLevelLowerCase = logLevelUnfolded.toLowerCase();

  if (logLevelLowerCase.startsWith('trace')) {
    return LogLevelCoalescedValue.trace;
  }

  if (logLevelLowerCase.startsWith('deb')) {
    return LogLevelCoalescedValue.debug;
  }

  if (logLevelLowerCase.startsWith('info')) {
    return LogLevelCoalescedValue.info;
  }

  if (
    logLevelLowerCase.startsWith('warn') || // warning
    logLevelLowerCase.startsWith('not') // notice
  ) {
    return LogLevelCoalescedValue.warning;
  }

  if (logLevelLowerCase.startsWith('err')) {
    return LogLevelCoalescedValue.error;
  }

  if (
    logLevelLowerCase.startsWith('cri') || // critical
    logLevelLowerCase.startsWith('sev') || // severe
    logLevelLowerCase.startsWith('ale') || // alert
    logLevelLowerCase.startsWith('emer') // emergency
  ) {
    return LogLevelCoalescedValue.critical;
  }

  if (logLevelLowerCase.startsWith('fatal')) {
    return LogLevelCoalescedValue.fatal;
  }
};
