/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConsoleAppenderConfig } from './console';
import { FileAppenderConfig } from './file';
import { RewriteAppenderConfig } from './rewrite';
import { RollingFileAppenderConfig } from './rolling_file';

export type { ConsoleAppenderConfig } from './console';
export type { FileAppenderConfig } from './file';
export type {
  RewriteAppenderConfig,
  MetaRewritePolicyConfig,
  RewritePolicyConfig,
  MetaRewritePolicyConfigProperty,
} from './rewrite';
export type {
  RollingFileAppenderConfig,
  TriggeringPolicyConfig,
  SizeLimitTriggeringPolicyConfig,
  TimeIntervalTriggeringPolicyConfig,
  NumericRollingStrategyConfig,
  RollingStrategyConfig,
  RetentionPolicyConfig,
} from './rolling_file';

/** @public */
export type AppenderConfigType =
  | ConsoleAppenderConfig
  | FileAppenderConfig
  | RewriteAppenderConfig
  | RollingFileAppenderConfig;
