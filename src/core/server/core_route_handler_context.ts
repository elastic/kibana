/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchRequestHandlerContext } from '@kbn/core-elasticsearch-server';
import { CoreElasticsearchRouteHandlerContext } from '@kbn/core-elasticsearch-server-internal';
import type { SavedObjectsRequestHandlerContext } from '@kbn/core-saved-objects-server';
import { CoreSavedObjectsRouteHandlerContext } from '@kbn/core-saved-objects-server-internal';
import type { DeprecationsRequestHandlerContext } from '@kbn/core-deprecations-server';
import { CoreDeprecationsRouteHandlerContext } from '@kbn/core-deprecations-server-internal';
import type { UiSettingsRequestHandlerContext } from '@kbn/core-ui-settings-server';
import { CoreUiSettingsRouteHandlerContext } from '@kbn/core-ui-settings-server-internal';
import type { InternalCoreStart } from './internal_types';

/**
 * The `core` context provided to route handler.
 *
 * Provides the following clients and services:
 *    - {@link SavedObjectsClient | savedObjects.client} - Saved Objects client
 *      which uses the credentials of the incoming request
 *    - {@link ISavedObjectTypeRegistry | savedObjects.typeRegistry} - Type registry containing
 *      all the registered types.
 *    - {@link IScopedClusterClient | elasticsearch.client} - Elasticsearch
 *      data client which uses the credentials of the incoming request
 *    - {@link IUiSettingsClient | uiSettings.client} - uiSettings client
 *      which uses the credentials of the incoming request
 * @public
 */
export interface CoreRequestHandlerContext {
  savedObjects: SavedObjectsRequestHandlerContext;
  elasticsearch: ElasticsearchRequestHandlerContext;
  uiSettings: UiSettingsRequestHandlerContext;
  deprecations: DeprecationsRequestHandlerContext;
}

/**
 * The concrete implementation for Core's route handler context.
 *
 * @internal
 */
export class CoreRouteHandlerContext implements CoreRequestHandlerContext {
  readonly elasticsearch: CoreElasticsearchRouteHandlerContext;
  readonly savedObjects: CoreSavedObjectsRouteHandlerContext;
  readonly uiSettings: CoreUiSettingsRouteHandlerContext;
  readonly deprecations: CoreDeprecationsRouteHandlerContext;

  constructor(coreStart: InternalCoreStart, request: KibanaRequest) {
    this.elasticsearch = new CoreElasticsearchRouteHandlerContext(coreStart.elasticsearch, request);
    this.savedObjects = new CoreSavedObjectsRouteHandlerContext(coreStart.savedObjects, request);
    this.uiSettings = new CoreUiSettingsRouteHandlerContext(
      coreStart.uiSettings,
      this.savedObjects
    );
    this.deprecations = new CoreDeprecationsRouteHandlerContext(
      coreStart.deprecations,
      this.elasticsearch,
      this.savedObjects
    );
  }
}
