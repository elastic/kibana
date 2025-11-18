/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringifyZodError } from '@kbn/zod-helpers';
import { configSchema } from './schemas';
import type { InitialBenchConfig } from './types';

export function assertConfig(
  config: unknown
): asserts config is Omit<InitialBenchConfig, 'configPath'> {
  const { error } = configSchema.safeParse(config);

  if (error) {
    throw new Error(stringifyZodError(error));
  }
}
