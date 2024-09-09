/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MaybePromise } from '@kbn/utility-types';
import type { ConfigDeprecationProvider } from '@kbn/config';
import type { Type } from '@kbn/config-schema';

/**
 * Descriptor of a core service configuration
 *
 * @internal
 */
export interface ServiceConfigDescriptor<T = any> {
  path: string;
  /**
   * Schema to use to validate the configuration.
   */
  schema: Type<T>;
  /**
   * Provider for the {@link ConfigDeprecation} to apply to the plugin configuration.
   */
  deprecations?: ConfigDeprecationProvider;
}

/**
 * Base interface that all core service should implement
 *
 * @internal
 */
export interface CoreService<TSetup = void, TStart = void> {
  setup(...params: any[]): MaybePromise<TSetup>;
  start(...params: any[]): MaybePromise<TStart>;
  stop(): MaybePromise<void>;
}
