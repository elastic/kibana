/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScriptLogger } from './script_logger';

export const routeConsoleToLogger = (
  level: string,
  message: string,
  logger: ScriptLogger
): void => {
  switch (level) {
    case 'debug':
      logger.debug(message);
      return;
    case 'warn':
      logger.warn(message);
      return;
    case 'error':
      logger.error(message);
      return;
    case 'info':
    default:
      logger.info(message);
  }
};
