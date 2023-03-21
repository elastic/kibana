/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISavedObjectTypeRegistry, SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { CoreUsageDataSetup, CoreIncrementUsageCounter } from '@kbn/core-usage-data-server';
import type { ICoreUsageStatsClient } from './usage_stats_client';

type SavedObjectTypeRegistry = ISavedObjectTypeRegistry & {
  registerType(type: SavedObjectsType): void;
};

/** @internal */
export interface InternalCoreUsageDataSetup extends CoreUsageDataSetup {
  registerType(typeRegistry: SavedObjectTypeRegistry): void;

  getClient(): ICoreUsageStatsClient;

  /** @internal {@link CoreIncrementUsageCounter} **/
  incrementUsageCounter: CoreIncrementUsageCounter;
}
