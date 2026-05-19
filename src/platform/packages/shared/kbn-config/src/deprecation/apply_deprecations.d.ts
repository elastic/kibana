/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AddConfigDeprecation,
  ChangedDeprecatedPaths,
  ConfigDeprecationWithContext,
} from './types';
/**
 * Applies deprecations on given configuration and passes addDeprecation hook.
 * This hook is used for logging any deprecation warning using provided logger.
 * This hook is used for exposing deprecated configs that must be handled by the user before upgrading to next major.
 *
 * @internal
 */
export declare const applyDeprecations: (
  config: Record<string, any>,
  deprecations: ConfigDeprecationWithContext[],
  createAddDeprecation?: (pluginId: string) => AddConfigDeprecation
) => {
  config: Record<string, any>;
  changedPaths: ChangedDeprecatedPaths;
};
