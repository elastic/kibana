/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogLevel, Logger, LoggerFactory, LogLevelId, DisposableAppender } from '@kbn/logging';
import { getLoggerContext } from '@kbn/core-logging-common-internal';
import type { LoggerConfigType } from './types';
import { BaseLogger } from './logger';
import { PatternLayout } from './layouts';
import { ConsoleAppender } from './appenders';

export interface BrowserLoggingConfig {
  logLevel: LogLevelId;
}

const CONSOLE_APPENDER_ID = 'console';

/**
 * @internal
 */
export interface IBrowserLoggingSystem extends LoggerFactory {
  asLoggerFactory(): LoggerFactory;
}

/**
 * @internal
 */
export class BrowserLoggingSystem implements IBrowserLoggingSystem {
  private readonly loggers: Map<string, Logger> = new Map();
  private readonly appenders: Map<string, DisposableAppender> = new Map();

  constructor(private readonly loggingConfig: BrowserLoggingConfig) {
    this.setupSystem(loggingConfig);
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
    return {
      level: this.loggingConfig.logLevel,
      appenders: [CONSOLE_APPENDER_ID],
      name: context,
    };
  }

  private setupSystem(loggingConfig: BrowserLoggingConfig) {
    const consoleAppender = new ConsoleAppender(new PatternLayout());
    this.appenders.set(CONSOLE_APPENDER_ID, consoleAppender);
  }

  /**
   * Safe wrapper that allows passing logging service as immutable LoggerFactory.
   */
  public asLoggerFactory(): LoggerFactory {
    return { get: (...contextParts: string[]) => this.get(...contextParts) };
  }
}
