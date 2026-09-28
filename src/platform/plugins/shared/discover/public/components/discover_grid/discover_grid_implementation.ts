/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverGridImplementation } from '../../application/main/state_management/redux/types';

export type { DiscoverGridImplementation };

export const DISCOVER_GRID_IMPLEMENTATION_STORAGE_KEY = 'discoverGridImplementation';
export const DEFAULT_DISCOVER_GRID_IMPLEMENTATION: DiscoverGridImplementation = 'tanstack';

const getStorageKey = (consumer: string) =>
  `${consumer}:${DISCOVER_GRID_IMPLEMENTATION_STORAGE_KEY}`;

export const isDiscoverGridImplementation = (
  value: unknown
): value is DiscoverGridImplementation => value === 'tanstack' || value === 'unified';

/** Returns a known grid implementation, falling back when the value is missing or invalid. */
export const resolveDiscoverGridImplementation = (
  value: unknown,
  fallback: DiscoverGridImplementation = DEFAULT_DISCOVER_GRID_IMPLEMENTATION
): DiscoverGridImplementation => (isDiscoverGridImplementation(value) ? value : fallback);

export const getDiscoverGridImplementation = (
  storage: Storage,
  consumer = 'discover'
): DiscoverGridImplementation => {
  return resolveDiscoverGridImplementation(storage.get(getStorageKey(consumer)));
};

export const setDiscoverGridImplementation = (
  storage: Storage,
  implementation: DiscoverGridImplementation,
  consumer = 'discover'
): void => {
  storage.set(getStorageKey(consumer), implementation);
};
