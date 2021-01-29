/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { ConfigDeprecationWithContext, ConfigDeprecationLogger } from './types';

const noopLogger = (msg: string) => undefined;

/**
 * Applies deprecations on given configuration and logs any deprecation warning using provided logger.
 *
 * @internal
 */
export const applyDeprecations = (
  config: Record<string, any>,
  deprecations: ConfigDeprecationWithContext[],
  logger: ConfigDeprecationLogger = noopLogger
) => {
  let processed = cloneDeep(config);
  deprecations.forEach(({ deprecation, path }) => {
    processed = deprecation(processed, path, logger);
  });
  return processed;
};
