/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFlattenedObject, merge } from '@kbn/std';
import { DisposableAppender, LogLevel, Logger, LoggerFactory, LogMeta } from '@kbn/logging';
import type { LoggerConfigType, LoggerContextConfigInput } from '@kbn/core-logging-server';
import { Appenders } from './appenders/appenders';
import { BufferAppender } from './appenders/buffer/buffer_appender';
import { BaseLogger } from './logger';
import { LoggerAdapter } from './logger_adapter';
import {
  LoggingConfigType,
  LoggingConfig,
  LoggerContextConfigType,
  loggerContextConfigSchema,
  config as loggingConfig,
} from './logging_config';

/** @internal */
export interface ILoggingSystem extends LoggerFactory {
  asLoggerFactory(): LoggerFactory;
  upgrade(rawConfig?: LoggingConfigType): Promise<void>;
  setContextConfig(baseContextParts: string[], rawConfig: LoggerContextConfigInput): Promise<void>;
  setGlobalContext(meta: Partial<LogMeta>): void;
  stop(): Promise<void>;
}

/**
 * System that is responsible for maintaining loggers and logger appenders.
 * @internal
 */
export class LoggingSystem implements ILoggingSystem {
  /** The configuration set by the user. */
  private baseConfig?: LoggingConfig;
  /** The fully computed configuration extended by context-specific configurations set programmatically */
  private computedConfig?: LoggingConfig;
  private readonly appenders: Map<string, DisposableAppender> = new Map();
  private readonly bufferAppender = new BufferAppender();
  private readonly loggers: Map<string, LoggerAdapter> = new Map();
  private readonly contextConfigs = new Map<string, LoggerContextConfigType>();
  private globalContext: Partial<LogMeta> = {};

  constructor() {}

  public get(...contextParts: string[]): Logger {
    const context = LoggingConfig.getLoggerContext(contextParts);
    if (!this.loggers.has(context)) {
      this.loggers.set(
        context,
        new LoggerAdapter(
          this.createLogger(context, this.computedConfig),
          getFlattenedObject(this.globalContext)
        )
      );
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
   * @param rawConfig New config instance. if unspecified, the default logging configuration
   *                  will be used.
   */
  public async upgrade(rawConfig?: LoggingConfigType) {
    const usedConfig = rawConfig ?? loggingConfig.schema.validate({});
    const config = new LoggingConfig(usedConfig);
    await this.applyBaseConfig(config);
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
   *     loggers: [{ name: 'search', appenders: ['default'] }]
   *   }
   * )
   * ```
   *
   * @param baseContextParts
   * @param rawConfig
   */
  public async setContextConfig(baseContextParts: string[], rawConfig: LoggerContextConfigInput) {
    const context = LoggingConfig.getLoggerContext(baseContextParts);
    const contextConfig = loggerContextConfigSchema.validate(rawConfig);
    this.contextConfigs.set(context, {
      ...contextConfig,
      // Automatically prepend the base context to the logger sub-contexts
      loggers: contextConfig.loggers.map((l) => ({
        ...l,
        name: LoggingConfig.getLoggerContext(l.name.length > 0 ? [context, l.name] : [context]),
      })),
    });

    // If we already have a base config, apply the config. If not, custom context configs
    // will be picked up on next call to `upgrade`.
    if (this.baseConfig) {
      await this.applyBaseConfig(this.baseConfig);
    }
  }

  /**
   * A mechanism for specifying some "global" {@link LogMeta} that we want
   * to inject into all log entries.
   *
   * @remarks
   * The provided context will be merged with the meta of each individual log
   * entry. In the case of conflicting keys, the global context will always be
   * overridden by the log entry.
   */
  public setGlobalContext(meta: Partial<LogMeta>) {
    this.globalContext = merge(this.globalContext, meta);
    const flattenedContext = getFlattenedObject(this.globalContext);
    for (const loggerAdapter of this.loggers.values()) {
      loggerAdapter.updateGlobalContext(flattenedContext);
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

  /**
   * Retrieves an appender by the provided key, after first checking that no circular
   * dependencies exist between appender refs.
   */
  private getAppenderByRef(appenderRef: string) {
    const checkCircularRefs = (key: string, stack: string[]) => {
      if (stack.includes(key)) {
        throw new Error(`Circular appender reference detected: [${stack.join(' -> ')} -> ${key}]`);
      }
      stack.push(key);
      const appender = this.appenders.get(key);
      if (appender?.appenderRefs) {
        appender.appenderRefs.forEach((ref) => checkCircularRefs(ref, [...stack]));
      }
      return appender;
    };

    return checkCircularRefs(appenderRef, []);
  }

  private async applyBaseConfig(newBaseConfig: LoggingConfig) {
    this.enforceBufferAppendersUsage();

    const computedConfig = [...this.contextConfigs.values()].reduce(
      (baseConfig, contextConfig) => baseConfig.extend(contextConfig),
      newBaseConfig
    );

    // Appenders must be reset, so we first dispose of the current ones, then
    // build up a new set of appenders.
    await Promise.all([...this.appenders.values()].map((a) => a.dispose()));
    this.appenders.clear();

    for (const [appenderKey, appenderConfig] of computedConfig.appenders) {
      this.appenders.set(appenderKey, Appenders.create(appenderConfig));
    }

    // Once all appenders have been created, check for any that have explicitly
    // declared `appenderRefs` dependencies, and look up those dependencies to
    // attach to the appender. This enables appenders to act as a sort of
    // middleware and call `append` on each other if needed.
    for (const [key, appender] of this.appenders) {
      if (!appender.addAppender || !appender.appenderRefs) {
        continue;
      }
      for (const ref of appender.appenderRefs) {
        const foundAppender = this.getAppenderByRef(ref);
        if (!foundAppender) {
          throw new Error(`Appender "${key}" config contains unknown appender key "${ref}".`);
        }
        appender.addAppender(ref, foundAppender);
      }
    }

    this.enforceConfiguredAppendersUsage(computedConfig);
    // We keep a reference to the base config so we can properly extend it
    // on each config change.
    this.baseConfig = newBaseConfig;

    // Re-log all buffered log records with newly configured appenders.
    for (const logRecord of this.bufferAppender.flush()) {
      this.get(logRecord.context).log(logRecord);
    }
  }

  // reconfigure all the loggers to have them use the buffer appender
  // while we are awaiting for the appenders to be disposed.
  private enforceBufferAppendersUsage() {
    for (const [loggerKey, loggerAdapter] of this.loggers) {
      loggerAdapter.updateLogger(this.createLogger(loggerKey, undefined));
    }

    // new loggers created during applyBaseConfig execution should use the buffer appender as well
    this.computedConfig = undefined;
  }

  private enforceConfiguredAppendersUsage(config: LoggingConfig) {
    for (const [loggerKey, loggerAdapter] of this.loggers) {
      loggerAdapter.updateLogger(this.createLogger(loggerKey, config));
    }
    this.computedConfig = config;
  }
}
