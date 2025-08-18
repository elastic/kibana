/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { FavoritesPocPluginSetup, FavoritesPocPluginStart } from './types';
import { FavoritesService } from './services/favorites_service';

export class FavoritesPocPlugin
  implements Plugin<FavoritesPocPluginSetup, FavoritesPocPluginStart>
{
  public setup(core: CoreSetup): FavoritesPocPluginSetup {
    return {};
  }

  public start(core: CoreStart): FavoritesPocPluginStart {
    const favoritesService = new FavoritesService({
      http: core.http,
      userProfile: core.userProfile,
      usageCollection: core.usageCollection,
    });

    return {
      favoritesService,
    };
  }

  public stop() {}
}
