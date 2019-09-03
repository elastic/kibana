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
import { Appenders, DisposableAppender } from './appenders/appenders';
import { BufferAppender } from './appenders/buffer/buffer_appender';
import { LogLevel } from './log_level';
import { BaseLogger, Logger } from './logger';
import { LoggerAdapter } from './logger_adapter';
import { LoggerFactory } from './logger_factory';
import { LoggingConfigType, LoggerConfigType, LoggingConfig } from './logging_config';

/**
 * Service that is responsible for maintaining loggers and logger appenders.
 * @internal
 */
export class LoggingService implements LoggerFactory {
  private config?: LoggingConfig;
  private readonly appenders: Map<string, DisposableAppender> = new Map();
  private readonly bufferAppender = new BufferAppender();
  private readonly loggers: Map<string, LoggerAdapter> = new Map();

  public get(...contextParts: string[]): Logger {
    const context = LoggingConfig.getLoggerContext(contextParts);
    if (this.loggers.has(context)) {
      return this.loggers.get(context)!;
    }

    this.loggers.set(context, new LoggerAdapter(this.createLogger(context, this.config)));

    return this.loggers.get(context)!;
  }

  /**
   * Safe wrapper that allows passing logging service as immutable LoggerFactory.
   */
  public asLoggerFactory(): LoggerFactory {
    return { get: (...contextParts: string[]) => this.get(...contextParts) };
  }

  /**
   * Updates all current active loggers with the new config values.
   * @param config New config instance.
   */
  public upgrade(rawConfig: LoggingConfigType) {
    const config = new LoggingConfig(rawConfig);
    // Config update is asynchronous and may require some time to complete, so we should invalidate
    // config so that new loggers will be using BufferAppender until newly configured appenders are ready.
    this.config = undefined;

    // Appenders must be reset, so we first dispose of the current ones, then
    // build up a new set of appenders.
    for (const appender of this.appenders.values()) {
      appender.dispose();
    }
    this.appenders.clear();

    for (const [appenderKey, appenderConfig] of config.appenders) {
      this.appenders.set(appenderKey, Appenders.create(appenderConfig));
    }

    for (const [loggerKey, loggerAdapter] of this.loggers) {
      loggerAdapter.updateLogger(this.createLogger(loggerKey, config));
    }

    this.config = config;

    // Re-log all buffered log records with newly configured appenders.
    for (const logRecord of this.bufferAppender.flush()) {
      this.get(logRecord.context).log(logRecord);
    }
  }

  /**
   * Disposes all loggers (closes log files, clears buffers etc.). Service is not usable after
   * calling of this method until new config is provided via `upgrade` method.
   * @returns Promise that is resolved once all loggers are successfully disposed.
   */
  public async stop() {
    for (const appender of this.appenders.values()) {
      await appender.dispose();
    }

    await this.bufferAppender.dispose();

    this.appenders.clear();
    this.loggers.clear();
  }

  private createLogger(context: string, config: LoggingConfig | undefined) {
    if (config === undefined) {
      // If we don't have config yet, use `buffered` appender that will store all logged messages in the memory
      // until the config is ready.
      return new BaseLogger(context, LogLevel.All, [this.bufferAppender]);
    }

    const { level, appenders } = this.getLoggerConfigByContext(config, context);
    const loggerLevel = LogLevel.fromId(level);
    const loggerAppenders = appenders.map(appenderKey => this.appenders.get(appenderKey)!);

    return new BaseLogger(context, loggerLevel, loggerAppenders);
  }

  private getLoggerConfigByContext(config: LoggingConfig, context: string): LoggerConfigType {
    const loggerConfig = config.loggers.get(context);
    if (loggerConfig !== undefined) {
      return loggerConfig;
    }

    // If we don't have configuration for the specified context and it's the "nested" one (eg. `foo.bar.baz`),
    // let's move up to the parent context (eg. `foo.bar`) and check if it has config we can rely on. Otherwise
    // we fallback to the `root` context that should always be defined (enforced by configuration schema).
    return this.getLoggerConfigByContext(config, LoggingConfig.getParentLoggerContext(context));
  }
}
