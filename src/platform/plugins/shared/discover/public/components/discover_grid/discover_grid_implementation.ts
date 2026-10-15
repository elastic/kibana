/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverGridImplementation } from '../../application/main/state_management/redux/types';

export type { DiscoverGridImplementation };

/** Default when `discover.enableTanstackTable` is unset. */
export const DEFAULT_ENABLE_TANSTACK_TABLE = true;

export const isDiscoverGridImplementation = (value: unknown): value is DiscoverGridImplementation =>
  value === 'tanstack' || value === 'unified';

/** Maps the `discover.enableTanstackTable` feature flag to a grid implementation. */
export const toDiscoverGridImplementation = (
  enableTanstackTable: boolean
): DiscoverGridImplementation => (enableTanstackTable ? 'tanstack' : 'unified');

/** Returns a known grid implementation, falling back when the value is missing or invalid. */
export const resolveDiscoverGridImplementation = (
  value: unknown,
  fallback: DiscoverGridImplementation = toDiscoverGridImplementation(
    DEFAULT_ENABLE_TANSTACK_TABLE
  )
): DiscoverGridImplementation => (isDiscoverGridImplementation(value) ? value : fallback);
