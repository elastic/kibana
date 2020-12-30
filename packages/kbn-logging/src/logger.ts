/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { LogRecord } from './log_record';

/**
 * Contextual metadata
 *
 * @public
 */
export interface LogMeta {
  [key: string]: any;
}

/**
 * Logger exposes all the necessary methods to log any type of information and
 * this is the interface used by the logging consumers including plugins.
 *
 * @public
 */
export interface Logger {
  /**
   * Log messages at the most detailed log level
   *
   * @param message - The log message
   * @param meta -
   */
  trace(message: string, meta?: LogMeta): void;

  /**
   * Log messages useful for debugging and interactive investigation
   * @param message - The log message
   * @param meta -
   */
  debug(message: string, meta?: LogMeta): void;

  /**
   * Logs messages related to general application flow
   * @param message - The log message
   * @param meta -
   */
  info(message: string, meta?: LogMeta): void;

  /**
   * Logs abnormal or unexpected errors or messages
   * @param errorOrMessage - An Error object or message string to log
   * @param meta -
   */
  warn(errorOrMessage: string | Error, meta?: LogMeta): void;

  /**
   * Logs abnormal or unexpected errors or messages that caused a failure in the application flow
   *
   * @param errorOrMessage - An Error object or message string to log
   * @param meta -
   */
  error(errorOrMessage: string | Error, meta?: LogMeta): void;

  /**
   * Logs abnormal or unexpected errors or messages that caused an unrecoverable failure
   *
   * @param errorOrMessage - An Error object or message string to log
   * @param meta -
   */
  fatal(errorOrMessage: string | Error, meta?: LogMeta): void;

  /** @internal */
  log(record: LogRecord): void;

  /**
   * Returns a new {@link Logger} instance extending the current logger context.
   *
   * @example
   * ```typescript
   * const logger = loggerFactory.get('plugin', 'service'); // 'plugin.service' context
   * const subLogger = logger.get('feature'); // 'plugin.service.feature' context
   * ```
   */
  get(...childContextPaths: string[]): Logger;
}
