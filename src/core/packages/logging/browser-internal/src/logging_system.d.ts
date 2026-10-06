/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, LoggerFactory } from '@kbn/logging';
import type { BrowserLoggingConfig } from '@kbn/core-logging-common-internal';
/**
 * @internal
 */
export interface IBrowserLoggingSystem extends LoggerFactory {
  asLoggerFactory(): LoggerFactory;
}
/**
 * @internal
 */
export declare class BrowserLoggingSystem implements IBrowserLoggingSystem {
  private readonly computedConfig;
  private readonly loggers;
  private readonly appenders;
  constructor(loggingConfig: BrowserLoggingConfig);
  get(...contextParts: string[]): Logger;
  private createLogger;
  private getLoggerConfigByContext;
  private setupSystem;
  /**
   * Safe wrapper that allows passing logging service as immutable LoggerFactory.
   */
  asLoggerFactory(): LoggerFactory;
}
