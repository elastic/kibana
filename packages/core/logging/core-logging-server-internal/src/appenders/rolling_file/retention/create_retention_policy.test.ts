/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RollingStrategyConfig } from '@kbn/core-logging-server';
import { mergeRetentionPolicyConfig } from './create_retention_policy';

describe('mergeRetentionPolicyConfig', () => {
  const createRollingStrategyConfig = (max: number): RollingStrategyConfig => {
    return {
      type: 'numeric',
      pattern: '-%i',
      max,
    };
  };

  it('uses the value from the retention strategy config if defined', () => {
    const merged = mergeRetentionPolicyConfig({ maxFiles: 42 }, createRollingStrategyConfig(10));
    expect(merged).toEqual({
      maxFiles: 42,
    });
  });

  it('uses the value from the rolling strategy config not defined on the retention config', () => {
    const merged = mergeRetentionPolicyConfig({}, createRollingStrategyConfig(10));
    expect(merged).toEqual({
      maxFiles: 10,
    });
  });
});
