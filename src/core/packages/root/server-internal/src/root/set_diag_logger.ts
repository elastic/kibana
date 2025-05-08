/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DiagLogLevel, DiagLogger, diag } from '@opentelemetry/api';
import { LogLevelId, Logger } from '@kbn/logging';
import { format } from 'util';

export function setDiagLogger(logger: Logger, logLevel?: LogLevelId) {
  const diagLogger: DiagLogger = {
    debug: (message, ...args) => {
      return logger.debug(() => format(message, ...args));
    },
    error: (message, ...args) => {
      return logger.error(() => format(message, ...args));
    },
    info: (message, ...args) => {
      return logger.info(() => format(message, ...args));
    },
    verbose: (message, ...args) => {
      return logger.trace(() => format(message, ...args));
    },
    warn: (message, ...args) => {
      return logger.warn(() => format(message, ...args));
    },
  };

  let level: DiagLogLevel;
  switch (logLevel) {
    case 'off':
      level = DiagLogLevel.NONE;
      break;
    case 'fatal':
    case 'error':
      level = DiagLogLevel.ERROR;
      break;
    case 'warn':
      level = DiagLogLevel.WARN;
      break;

    default:
    case 'info':
      level = DiagLogLevel.INFO;
      break;
    case 'debug':
      level = DiagLogLevel.DEBUG;
      break;
    case 'trace':
      level = DiagLogLevel.VERBOSE;
      break;
    case 'all':
      level = DiagLogLevel.ALL;
      break;
  }

  diag.setLogger(diagLogger, {
    suppressOverrideMessage: true,
    logLevel: level,
  });
}
