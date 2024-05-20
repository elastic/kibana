/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import type { LoggerConfigType } from './logger';
import type { AppenderConfigType } from './appenders';

/**
 * Provides APIs to plugins for customizing the plugin's logger.
 * @public
 */
export interface LoggingServiceSetup {
  /**
   * Customizes the logging config for the plugin's context.
   *
   * @remarks
   * Assumes that that the `context` property of the individual `logger` items emitted by `config$`
   * are relative to the plugin's logging context (defaults to `plugins.<plugin_id>`).
   *
   * @example
   * Customize the configuration for the plugins.data.search context.
   * ```ts
   * core.logging.configure(
   *   of({
   *     appenders: new Map(),
   *     loggers: [{ name: 'search', appenders: ['default'] }]
   *   })
   * )
   * ```
   *
   * @param config$
   */
  configure(config$: Observable<LoggerContextConfigInput>): void;
}

/**
 * Input used to configure logging dynamically using {@link LoggingServiceSetup.configure}
 * @public
 */
export interface LoggerContextConfigInput {
  // config-schema knows how to handle either Maps or Records
  appenders?: Record<string, AppenderConfigType> | Map<string, AppenderConfigType>;
  loggers?: LoggerConfigType[];
}
