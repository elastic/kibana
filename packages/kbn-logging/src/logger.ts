/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { LogMeta } from './log_meta';
import type { LogRecord } from './log_record';
import type { LogLevelId } from './log_level';

/**
 * @public
 */
export type LogMessageSource = string | (() => string);

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
   * @param message - The log message, or a function returning the log message
   * @param meta - The ECS meta to attach to the log entry
   *
   * @remark If a function is provided for the message, it will only be evaluated if the logger's level is high enough for this level.
   *         This can be used as an alternative to {@link Logger.isLevelEnabled} to wrap expensive logging operations into a conditional blocks.
   */
  trace<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void;

  /**
   * Log messages useful for debugging and interactive investigation
   *
   * @param message - The log message, or a function returning the log message
   * @param meta - The ECS meta to attach to the log entry
   *
   * @remark If a function is provided for the message, it will only be evaluated if the logger's level is high enough for this level.
   *         This can be used as an alternative to {@link Logger.isLevelEnabled} to wrap expensive logging operations into a conditional blocks.
   */
  debug<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void;

  /**
   * Logs messages related to general application flow
   *
   * @param message - The log message, or a function returning the log message
   * @param meta - The ECS meta to attach to the log entry
   *
   * @remark If a function is provided for the message, it will only be evaluated if the logger's level is high enough for this level.
   *         This can be used as an alternative to {@link Logger.isLevelEnabled} to wrap expensive logging operations into a conditional blocks.
   */
  info<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void;

  /**
   * Logs abnormal or unexpected errors or messages
   *
   * @param errorOrMessage - An Error object, message string, or function returning the log message
   * @param meta - The ECS meta to attach to the log entry
   *
   * @remark If a function is provided for the message, it will only be evaluated if the logger's level is high enough for this level.
   *         This can be used as an alternative to {@link Logger.isLevelEnabled} to wrap expensive logging operations into a conditional blocks.
   */
  warn<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta): void;

  /**
   * Logs abnormal or unexpected errors or messages that caused a failure in the application flow
   *
   * @param errorOrMessage - An Error object, message string, or function returning the log message
   * @param meta - The ECS meta to attach to the log entry
   *
   * @remark If a function is provided for the message, it will only be evaluated if the logger's level is high enough for this level.
   *         This can be used as an alternative to {@link Logger.isLevelEnabled} to wrap expensive logging operations into a conditional blocks.
   */
  error<Meta extends LogMeta = LogMeta>(
    errorOrMessage: LogMessageSource | Error,
    meta?: Meta
  ): void;

  /**
   * Logs abnormal or unexpected errors or messages that caused an unrecoverable failure
   *
   * @param errorOrMessage - An Error object, message string, or function returning the log message
   * @param meta - The ECS meta to attach to the log entry
   *
   * @remark If a function is provided for the message, it will only be evaluated if the logger's level is high enough for this level.
   *         This can be used as an alternative to {@link Logger.isLevelEnabled} to wrap expensive logging operations into a conditional blocks.
   */
  fatal<Meta extends LogMeta = LogMeta>(
    errorOrMessage: LogMessageSource | Error,
    meta?: Meta
  ): void;

  /** @internal */
  log(record: LogRecord): void;

  /**
   * Checks if given level is currently enabled for this logger.
   * Can be used to wrap expensive logging operations into conditional blocks
   *
   * @example
   * ```ts
   * if(logger.isLevelEnabled('info')) {
   *   const meta = await someExpensiveOperation();
   *   logger.info('some message', meta);
   * }
   * ```
   *
   * @param level The log level to check for.
   */
  isLevelEnabled(level: LogLevelId): boolean;

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
