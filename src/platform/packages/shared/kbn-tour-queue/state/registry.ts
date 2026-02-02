/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TourQueueStateManager } from './tour_queue_state';

/**
 * Global registry for ensuring single context instance across bundles
 *
 * This pattern is used to share a single state manager across bundles loaded from different plugins
 * https://github.com/elastic/kibana/issues/240770
 * @internal
 */
const REGISTRY_KEY = '__KIBANA_TOUR_QUEUE_CTX__';

interface TourQueueRegistry {
  tourQueueStateManager?: TourQueueStateManager;
}

const getGlobalRegistry = (): TourQueueRegistry => {
  if (typeof globalThis === 'undefined') {
    // Fallback for environments without globalThis
    return {};
  }
  return ((globalThis as any)[REGISTRY_KEY] ??= {} as TourQueueRegistry);
};

/**
 * Get or create the global tour queue instance.
 * This ensures a single state manager is shared across all plugins and bundles.
 * @internal
 * @remarks
 * Prefer using hook {@link useTourQueue}
 * @returns The global tour queue state manager instance
 */
export const getTourQueue = (): TourQueueStateManager => {
  const registry = getGlobalRegistry();
  return (registry.tourQueueStateManager ??= new TourQueueStateManager());
};
