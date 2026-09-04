/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { DEFERRED_INIT_STATE_TYPE } from '@kbn/core-deferred-init-common';

export { DEFERRED_INIT_STATE_TYPE };

/**
 * Cluster-global record of a plugin's deferred-init outcome, one document per plugin id.
 * Mutual exclusion for the run itself is handled separately by `@kbn/lock-manager`; this doc is
 * purely the "did anyone already finish this" cache so warm instances can skip both the lock and
 * the runner entirely.
 */
export interface DeferredInitStateAttributes {
  status: 'available' | 'failed';
  updatedAt: string;
  attempts: number;
  lastError?: string;
  /** Kibana version that last wrote this record. Used to invalidate stale state after an upgrade. */
  kibanaVersion: string;
}

/**
 * Read the shared state doc for a plugin id. Returns `undefined` if it doesn't exist yet or
 * can't be reached (treated the same: "unknown", not "definitely not available").
 */
export async function readDeferredInitState(
  savedObjects: ISavedObjectsRepository,
  logger: Logger,
  pluginId: string
): Promise<DeferredInitStateAttributes | undefined> {
  try {
    const doc = await savedObjects.get<DeferredInitStateAttributes>(
      DEFERRED_INIT_STATE_TYPE,
      pluginId
    );
    return doc.attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    // Can't reach the state doc (ES hiccup, etc). Treat as unknown rather than blocking: fall
    // through to the lock, which is the actual source of truth for serializing the run.
    logger.debug(`Deferred init state for "${pluginId}": failed to read: ${error}`);
    return undefined;
  }
}

/**
 * Persist the final outcome of a run. Always safe to call with `available`, even under a race,
 * since every concurrent writer converges on the same value; callers writing `failed` should
 * re-check state first so they can't clobber a peer's already-recorded success.
 */
export async function writeDeferredInitOutcome(
  savedObjects: ISavedObjectsRepository,
  logger: Logger,
  pluginId: string,
  status: 'available' | 'failed',
  previousAttempts: number,
  kibanaVersion: string,
  error?: unknown
): Promise<void> {
  try {
    await savedObjects.create<DeferredInitStateAttributes>(
      DEFERRED_INIT_STATE_TYPE,
      {
        status,
        updatedAt: new Date().toISOString(),
        attempts: previousAttempts + 1,
        kibanaVersion,
        ...(status === 'failed' && error !== undefined
          ? { lastError: error instanceof Error ? error.message : String(error) }
          : {}),
      },
      { id: pluginId, overwrite: true }
    );
  } catch (writeError) {
    logger.warn(
      `Deferred init state for "${pluginId}": failed to persist "${status}": ${writeError}`
    );
  }
}
