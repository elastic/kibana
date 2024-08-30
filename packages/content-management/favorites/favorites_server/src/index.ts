/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { registerFavoritesRoutes } from './favorites_routes';
import { favoritesSavedObjectType } from './favorites_saved_object';
import { registerFavoritesUsageCollection } from './favorites_usage_collection';

export type { GetFavoritesResponse } from './favorites_routes';

/**
 * @public
 * Registers the favorites feature enabling favorites saved object type and api routes.
 *
 * @param logger
 * @param core
 * @param usageCollection
 */
export function registerFavorites({
  logger,
  core,
  usageCollection,
}: {
  core: CoreSetup;
  logger: Logger;
  usageCollection?: UsageCollectionSetup;
}) {
  core.savedObjects.registerType(favoritesSavedObjectType);
  registerFavoritesRoutes({ core, logger });

  if (usageCollection) {
    registerFavoritesUsageCollection({ core, usageCollection });
  }
}
