/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type {
  ContentManagementServerSetup,
  ContentManagementServerStart,
  ContentManagementServerSetupDependencies,
  ContentManagementServerStartDependencies,
} from './types';
export declare class ContentManagementPlugin
  implements
    Plugin<
      ContentManagementServerSetup,
      ContentManagementServerStart,
      ContentManagementServerSetupDependencies,
      ContentManagementServerStartDependencies
    >
{
  private readonly logger;
  private readonly core;
  constructor(initializerContext: PluginInitializerContext);
  setup(
    core: CoreSetup,
    plugins: ContentManagementServerSetupDependencies
  ): {
    register: import('./core').ContentRegistry['register'];
    crud: <T = unknown>(contentType: string) => import('./core').ContentCrud<T>;
    eventBus: import('./core/event_bus').EventBus;
    contentClient: {
      getForRequest(deps: import('./core/core').GetContentClientForRequestDependencies): {
        for: <T = unknown>(
          contentTypeId: string,
          version?: import('@kbn/object-versioning').Version
        ) => import('./content_client').IContentClient<T>;
        msearch(args: import('../common').MSearchIn): Promise<import('../common').MSearchOut>;
      };
    };
    favorites: import('@kbn/content-management-favorites-server/src/favorites_registry').FavoritesRegistrySetup;
  };
  start(core: CoreStart): {};
}
