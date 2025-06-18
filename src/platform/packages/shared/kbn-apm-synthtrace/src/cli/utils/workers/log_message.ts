/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogLevel, Logger } from '../../../lib/utils/create_logger';

export function logMessage(logger: Logger, [logLevel, msg]: [LogLevel, string]) {
  switch (logLevel) {
    case LogLevel.debug:
      logger.debug(msg);
      break;
    case LogLevel.info:
      logger.info(msg);
      break;
    case LogLevel.verbose:
      logger.verbose(msg);
      break;
    case LogLevel.warn:
      logger.warning(msg);
      break;
    case LogLevel.error:
      logger.error(msg);
      break;
    default:
      logger.info(msg);
  }
}
