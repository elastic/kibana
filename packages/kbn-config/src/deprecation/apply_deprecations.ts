/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { ConfigDeprecationWithContext, AddConfigDeprecation } from './types';

const noopAddDeprecationFactory: () => AddConfigDeprecation = () => () => undefined;
/**
 * Applies deprecations on given configuration and passes addDeprecation hook.
 * This hook is used for logging any deprecation warning using provided logger.
 * This hook is used for exposing deprecated configs that must be handled by the user before upgrading to next major.
 *
 * @internal
 */
export const applyDeprecations = (
  config: Record<string, any>,
  deprecations: ConfigDeprecationWithContext[],
  createAddDeprecation: (pluginId: string) => AddConfigDeprecation = noopAddDeprecationFactory
) => {
  let processed = cloneDeep(config);
  deprecations.forEach(({ deprecation, path }) => {
    processed = deprecation(processed, path, createAddDeprecation(path));
  });
  return processed;
};
