/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogLevel, Logger, LoggerFactory, DisposableAppender } from '@kbn/logging';
import {
  ROOT_CONTEXT_NAME,
  getLoggerContext,
  getParentLoggerContext,
  BrowserLoggingConfig,
  BrowserLoggerConfig,
} from '@kbn/core-logging-common-internal';
import type { LoggerConfigType } from './types';
import { BaseLogger } from './logger';
import { PatternLayout } from './layouts';
import { ConsoleAppender } from './appenders';

const CONSOLE_APPENDER_ID = 'console';

/**
 * @internal
 */
export interface IBrowserLoggingSystem extends LoggerFactory {
  asLoggerFactory(): LoggerFactory;
}

interface ComputedLoggerConfig {
  loggers: Map<string, BrowserLoggerConfig>;
}

/**
 * @internal
 */
export class BrowserLoggingSystem implements IBrowserLoggingSystem {
  private readonly computedConfig: ComputedLoggerConfig;
  private readonly loggers: Map<string, Logger> = new Map();
  private readonly appenders: Map<string, DisposableAppender> = new Map();

  constructor(loggingConfig: BrowserLoggingConfig) {
    this.computedConfig = this.setupSystem(loggingConfig);
  }

  public get(...contextParts: string[]): Logger {
    const context = getLoggerContext(contextParts);
    if (!this.loggers.has(context)) {
      this.loggers.set(context, this.createLogger(context));
    }
    return this.loggers.get(context)!;
  }

  private createLogger(context: string) {
    const { level, appenders } = this.getLoggerConfigByContext(context);
    const loggerLevel = LogLevel.fromId(level);
    const loggerAppenders = appenders.map((appenderKey) => this.appenders.get(appenderKey)!);
    return new BaseLogger(context, loggerLevel, loggerAppenders, this.asLoggerFactory());
  }

  private getLoggerConfigByContext(context: string): LoggerConfigType {
    const loggerConfig = this.computedConfig.loggers.get(context);
    if (loggerConfig !== undefined) {
      return {
        name: loggerConfig.name,
        level: loggerConfig.level,
        appenders: [CONSOLE_APPENDER_ID],
      };
    }

    // If we don't have configuration for the specified context, we move up to the parent context, up to `root`
    return this.getLoggerConfigByContext(getParentLoggerContext(context));
  }

  private setupSystem(loggingConfig: BrowserLoggingConfig) {
    const consoleAppender = new ConsoleAppender(new PatternLayout());
    this.appenders.set(CONSOLE_APPENDER_ID, consoleAppender);

    const loggerConfigs = loggingConfig.loggers.reduce((loggers, logger) => {
      loggers.set(logger.name, logger);
      return loggers;
    }, new Map<string, BrowserLoggerConfig>());
    loggerConfigs.set(ROOT_CONTEXT_NAME, { name: ROOT_CONTEXT_NAME, ...loggingConfig.root });

    return {
      loggers: loggerConfigs,
    };
  }

  /**
   * Safe wrapper that allows passing logging service as immutable LoggerFactory.
   */
  public asLoggerFactory(): LoggerFactory {
    return { get: (...contextParts: string[]) => this.get(...contextParts) };
  }
}
