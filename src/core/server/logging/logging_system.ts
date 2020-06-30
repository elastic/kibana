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
import {
  LoggingConfigType,
  LoggerConfigType,
  LoggingConfig,
  LoggerContextConfigType,
  LoggerContextConfigInput,
  loggerContextConfigSchema,
} from './logging_config';

export type ILoggingSystem = PublicMethodsOf<LoggingSystem>;

/**
 * System that is responsible for maintaining loggers and logger appenders.
 * @internal
 */
export class LoggingSystem implements LoggerFactory {
  /** The configuration set by the user. */
  private baseConfig?: LoggingConfig;
  /** The fully computed configuration extended by context-specific configurations set programmatically */
  private computedConfig?: LoggingConfig;
  private readonly appenders: Map<string, DisposableAppender> = new Map();
  private readonly bufferAppender = new BufferAppender();
  private readonly loggers: Map<string, LoggerAdapter> = new Map();
  private readonly contextConfigs = new Map<string, LoggerContextConfigType>();

  public get(...contextParts: string[]): Logger {
    const context = LoggingConfig.getLoggerContext(contextParts);
    if (!this.loggers.has(context)) {
      this.loggers.set(context, new LoggerAdapter(this.createLogger(context, this.computedConfig)));
    }
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
   * @param rawConfig New config instance.
   */
  public upgrade(rawConfig: LoggingConfigType) {
    const config = new LoggingConfig(rawConfig)!;
    this.applyBaseConfig(config);
  }

  /**
   * Customizes the logging config for a specific context.
   *
   * @remarks
   * Assumes that that the `context` property of the individual items in `rawConfig.loggers`
   * are relative to the `baseContextParts`.
   *
   * @example
   * Customize the configuration for the plugins.data.search context.
   * ```ts
   * loggingSystem.setContextConfig(
   *   ['plugins', 'data'],
   *   {
   *     loggers: [{ context: 'search', appenders: ['default'] }]
   *   }
   * )
   * ```
   *
   * @param baseContextParts
   * @param rawConfig
   */
  public setContextConfig(baseContextParts: string[], rawConfig: LoggerContextConfigInput) {
    const context = LoggingConfig.getLoggerContext(baseContextParts);
    const contextConfig = loggerContextConfigSchema.validate(rawConfig);
    this.contextConfigs.set(context, {
      ...contextConfig,
      // Automatically prepend the base context to the logger sub-contexts
      loggers: contextConfig.loggers.map((l) => ({
        ...l,
        context: LoggingConfig.getLoggerContext(
          l.context.length > 0 ? [context, l.context] : [context]
        ),
      })),
    });

    // If we already have a base config, apply the config. If not, custom context configs
    // will be picked up on next call to `upgrade`.
    if (this.baseConfig) {
      this.applyBaseConfig(this.baseConfig);
    }
  }

  /**
   * Disposes all loggers (closes log files, clears buffers etc.). Service is not usable after
   * calling of this method until new config is provided via `upgrade` method.
   * @returns Promise that is resolved once all loggers are successfully disposed.
   */
  public async stop() {
    await Promise.all([...this.appenders.values()].map((a) => a.dispose()));

    await this.bufferAppender.dispose();

    this.appenders.clear();
    this.loggers.clear();
  }

  private createLogger(context: string, config: LoggingConfig | undefined) {
    if (config === undefined) {
      // If we don't have config yet, use `buffered` appender that will store all logged messages in the memory
      // until the config is ready.
      return new BaseLogger(context, LogLevel.All, [this.bufferAppender], this.asLoggerFactory());
    }

    const { level, appenders } = this.getLoggerConfigByContext(config, context);
    const loggerLevel = LogLevel.fromId(level);
    const loggerAppenders = appenders.map((appenderKey) => this.appenders.get(appenderKey)!);

    return new BaseLogger(context, loggerLevel, loggerAppenders, this.asLoggerFactory());
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

  private applyBaseConfig(newBaseConfig: LoggingConfig) {
    const computedConfig = [...this.contextConfigs.values()].reduce(
      (baseConfig, contextConfig) => baseConfig.extend(contextConfig),
      newBaseConfig
    );

    // Appenders must be reset, so we first dispose of the current ones, then
    // build up a new set of appenders.
    for (const appender of this.appenders.values()) {
      appender.dispose();
    }
    this.appenders.clear();

    for (const [appenderKey, appenderConfig] of computedConfig.appenders) {
      this.appenders.set(appenderKey, Appenders.create(appenderConfig));
    }

    for (const [loggerKey, loggerAdapter] of this.loggers) {
      loggerAdapter.updateLogger(this.createLogger(loggerKey, computedConfig));
    }

    // We keep a reference to the base config so we can properly extend it
    // on each config change.
    this.baseConfig = newBaseConfig;
    this.computedConfig = computedConfig;

    // Re-log all buffered log records with newly configured appenders.
    for (const logRecord of this.bufferAppender.flush()) {
      this.get(logRecord.context).log(logRecord);
    }
  }
}
