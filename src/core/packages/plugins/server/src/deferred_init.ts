/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';

/**
 * Lifecycle state of a plugin's deferred (lazy) Elasticsearch initialization.
 *
 * - `idle`: registered but not yet started. Boot pays nothing for it.
 * - `initializing`: the deferred work is currently running.
 * - `available`: the deferred work completed successfully; routes serve normally.
 * - `failed`: the deferred work threw. May be re-triggered.
 *
 * @public
 */
export type InitState = 'idle' | 'initializing' | 'available' | 'failed';

/**
 * Context handed to a plugin's {@link Plugin.lazyInitialize} method when core runs
 * its deferred initialization. Built from internal-user clients so it works for both
 * request-triggered and programmatic triggers (no incoming request required).
 *
 * @public
 */
export interface LazyInitContext {
  elasticsearch: {
    /** Internal-user Elasticsearch client. */
    client: ElasticsearchClient;
  };
  /** Internal-user saved objects repository. */
  savedObjects: ISavedObjectsRepository;
  /** Logger scoped to the plugin's deferred initialization. */
  logger: Logger;
}
