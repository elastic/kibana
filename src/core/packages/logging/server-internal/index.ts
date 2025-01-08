/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { config } from './src/logging_config';
export type {
  LoggingConfigType,
  LoggingConfigWithBrowserType,
  loggerContextConfigSchema,
  loggerSchema,
} from './src/logging_config';
export { LoggingSystem } from './src/logging_system';
export type { ILoggingSystem } from './src/logging_system';
export { LoggingService } from './src/logging_service';
export type {
  InternalLoggingServicePreboot,
  InternalLoggingServiceSetup,
  PrebootDeps,
} from './src/logging_service';
export { appendersSchema } from './src/appenders/appenders';
export { LoggerAdapter } from './src/logger_adapter';
export { getNextRollingTime } from './src/appenders/rolling_file/policies/time_interval';
