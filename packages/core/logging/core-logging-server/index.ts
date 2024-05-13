/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { LoggingServiceSetup, LoggerContextConfigInput } from './src/contracts';
export type { LoggerConfigType } from './src/logger';
export type { LayoutConfigType, JsonLayoutConfigType, PatternLayoutConfigType } from './src/layout';
export type {
  FileAppenderConfig,
  ConsoleAppenderConfig,
  RollingFileAppenderConfig,
  RewriteAppenderConfig,
  AppenderConfigType,
  RollingStrategyConfig,
  NumericRollingStrategyConfig,
  TimeIntervalTriggeringPolicyConfig,
  SizeLimitTriggeringPolicyConfig,
  TriggeringPolicyConfig,
  RewritePolicyConfig,
  MetaRewritePolicyConfigProperty,
  MetaRewritePolicyConfig,
} from './src/appenders';
