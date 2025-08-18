/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';

export interface FavoritesPocServerPluginSetup {}

export interface FavoritesPocServerPluginStart {}

export interface FavoritesPocServerPluginSetupDependencies {
  contentManagement: ContentManagementServerSetup;
}

export class FavoritesPocServerPlugin
  implements Plugin<FavoritesPocServerPluginSetup, FavoritesPocServerPluginStart>
{
  public setup(
    core: CoreSetup,
    { contentManagement }: FavoritesPocServerPluginSetupDependencies
  ): FavoritesPocServerPluginSetup {
    // Register search as a favorite type (this is the actual saved search content type)
    contentManagement.favorites.registerFavoriteType('search');

    return {};
  }

  public start(core: CoreStart): FavoritesPocServerPluginStart {
    return {};
  }

  public stop() {}
}
