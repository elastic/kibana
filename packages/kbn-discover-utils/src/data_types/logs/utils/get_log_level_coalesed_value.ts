/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export enum LogLevelCoalescedValue {
  trace = 'trace',
  debug = 'debug',
  info = 'info',
  notice = 'notice',
  warning = 'warning',
  error = 'error',
  critical = 'critical',
  alert = 'alert',
  emergency = 'emergency',
  fatal = 'fatal',
}

export const getLogLevelCoalescedValue = (
  logLevel: string | string[] | unknown
): LogLevelCoalescedValue | undefined => {
  const logLevelUnfolded = Array.isArray(logLevel) ? logLevel[0] : logLevel;

  if (typeof logLevelUnfolded !== 'string') {
    return undefined;
  }

  const logLevelLowerCase = logLevelUnfolded.trim().toLowerCase();

  if (logLevelLowerCase.startsWith('trace')) {
    return LogLevelCoalescedValue.trace;
  }

  if (logLevelLowerCase.startsWith('deb')) {
    return LogLevelCoalescedValue.debug;
  }

  if (logLevelLowerCase.startsWith('info')) {
    return LogLevelCoalescedValue.info;
  }

  if (logLevelLowerCase.startsWith('not')) {
    return LogLevelCoalescedValue.notice;
  }

  if (logLevelLowerCase.startsWith('warn')) {
    return LogLevelCoalescedValue.warning;
  }

  if (logLevelLowerCase.startsWith('err')) {
    return LogLevelCoalescedValue.error;
  }

  if (
    logLevelLowerCase.startsWith('cri') || // critical
    logLevelLowerCase.startsWith('sev') // severe
  ) {
    return LogLevelCoalescedValue.critical;
  }

  if (logLevelLowerCase.startsWith('ale')) {
    return LogLevelCoalescedValue.alert;
  }

  if (logLevelLowerCase.startsWith('emer')) {
    return LogLevelCoalescedValue.emergency;
  }

  if (logLevelLowerCase.startsWith('fatal')) {
    return LogLevelCoalescedValue.fatal;
  }
};

export const getLogLevelCoalescedValueLabel = (coalescedValue: LogLevelCoalescedValue) => {
  switch (coalescedValue) {
    case LogLevelCoalescedValue.trace:
      return i18n.translate('discover.logLevelLabels.trace', {
        defaultMessage: 'Trace',
      });
    case LogLevelCoalescedValue.debug:
      return i18n.translate('discover.logLevelLabels.debug', {
        defaultMessage: 'Debug',
      });
    case LogLevelCoalescedValue.info:
      return i18n.translate('discover.logLevelLabels.info', {
        defaultMessage: 'Info',
      });
    case LogLevelCoalescedValue.notice:
      return i18n.translate('discover.logLevelLabels.notice', {
        defaultMessage: 'Notice',
      });
    case LogLevelCoalescedValue.warning:
      return i18n.translate('discover.logLevelLabels.warning', {
        defaultMessage: 'Warning',
      });
    case LogLevelCoalescedValue.error:
      return i18n.translate('discover.logLevelLabels.error', {
        defaultMessage: 'Error',
      });
    case LogLevelCoalescedValue.critical:
      return i18n.translate('discover.logLevelLabels.critical', {
        defaultMessage: 'Critical',
      });
    case LogLevelCoalescedValue.alert:
      return i18n.translate('discover.logLevelLabels.alert', {
        defaultMessage: 'Alert',
      });
    case LogLevelCoalescedValue.emergency:
      return i18n.translate('discover.logLevelLabels.emergency', {
        defaultMessage: 'Emergency',
      });
    case LogLevelCoalescedValue.fatal:
      return i18n.translate('discover.logLevelLabels.fatal', {
        defaultMessage: 'Fatal',
      });
    default:
      // If you see a typescript error here, that's a sign that there are missing switch cases ^^
      const _exhaustiveCheck: never = coalescedValue;
      return coalescedValue || _exhaustiveCheck;
  }
};
