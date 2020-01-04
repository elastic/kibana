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
import { Logger, LogMeta } from './logger';

/** @internal */
export class LoggerAdapter implements Logger {
  constructor(private logger: Logger) {}

  /**
   * The current logger can be updated "on the fly", e.g. when the log config
   * has changed.
   *
   * This is not intended for external use, only internally in Kibana
   *
   * @internal
   */
  public updateLogger(logger: Logger) {
    this.logger = logger;
  }

  public trace(message: string, meta?: LogMeta): void {
    this.logger.trace(message, meta);
  }

  public debug(message: string, meta?: LogMeta): void {
    this.logger.debug(message, meta);
  }

  public info(message: string, meta?: LogMeta): void {
    this.logger.info(message, meta);
  }

  public warn(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.logger.warn(errorOrMessage, meta);
  }

  public error(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.logger.error(errorOrMessage, meta);
  }

  public fatal(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.logger.fatal(errorOrMessage, meta);
  }

  public log(record: LogRecord) {
    this.logger.log(record);
  }

  public get(...contextParts: string[]): Logger {
    return this.logger.get(...contextParts);
  }
}
