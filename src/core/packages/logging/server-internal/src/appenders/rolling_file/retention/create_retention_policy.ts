/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RetentionPolicyConfig, RollingStrategyConfig } from '@kbn/core-logging-server';
import type { RollingFileContext } from '../rolling_file_context';
import { GenericRetentionPolicy, type RetentionPolicy } from './retention_policy';

export const createRetentionPolicy = (
  config: RetentionPolicyConfig,
  context: RollingFileContext
): RetentionPolicy => {
  return new GenericRetentionPolicy(config, context);
};

export const mergeRetentionPolicyConfig = (
  config: RetentionPolicyConfig | undefined,
  strategyConfig: RollingStrategyConfig
): RetentionPolicyConfig => {
  return {
    ...config,
    maxFiles: config?.maxFiles || strategyConfig.max,
  };
};
