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

import { Appender } from './appenders/appenders';
import { LogLevel } from './log_level';
import { LogRecord } from './log_record';
import { LoggerFactory } from './logger_factory';

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

function isError(x: any): x is Error {
  return x instanceof Error;
}

/** @internal */
export class BaseLogger implements Logger {
  constructor(
    private readonly context: string,
    private readonly level: LogLevel,
    private readonly appenders: Appender[],
    private readonly factory: LoggerFactory
  ) {}

  public trace(message: string, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Trace, message, meta));
  }

  public debug(message: string, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Debug, message, meta));
  }

  public info(message: string, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Info, message, meta));
  }

  public warn(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Warn, errorOrMessage, meta));
  }

  public error(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Error, errorOrMessage, meta));
  }

  public fatal(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Fatal, errorOrMessage, meta));
  }

  public log(record: LogRecord) {
    if (!this.level.supports(record.level)) {
      return;
    }

    for (const appender of this.appenders) {
      appender.append(record);
    }
  }

  public get(...childContextPaths: string[]): Logger {
    return this.factory.get(...[this.context, ...childContextPaths]);
  }

  private createLogRecord(
    level: LogLevel,
    errorOrMessage: string | Error,
    meta?: LogMeta
  ): LogRecord {
    if (isError(errorOrMessage)) {
      return {
        context: this.context,
        error: errorOrMessage,
        level,
        message: errorOrMessage.message,
        meta,
        timestamp: new Date(),
      };
    }

    return {
      context: this.context,
      level,
      message: errorOrMessage,
      meta,
      timestamp: new Date(),
    };
  }
}
