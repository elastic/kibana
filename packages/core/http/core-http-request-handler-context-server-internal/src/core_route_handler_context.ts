/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import {
  CoreElasticsearchRouteHandlerContext,
  type InternalElasticsearchServiceStart,
} from '@kbn/core-elasticsearch-server-internal';
import {
  CoreSavedObjectsRouteHandlerContext,
  type InternalSavedObjectsServiceStart,
} from '@kbn/core-saved-objects-server-internal';
import {
  CoreDeprecationsRouteHandlerContext,
  type InternalDeprecationsServiceStart,
} from '@kbn/core-deprecations-server-internal';
import {
  CoreUiSettingsRouteHandlerContext,
  type InternalUiSettingsServiceStart,
} from '@kbn/core-ui-settings-server-internal';

/**
 * Subset of `InternalCoreStart` used by {@link CoreRouteHandlerContext}
 * @internal
 */
export interface CoreRouteHandlerContextParams {
  elasticsearch: InternalElasticsearchServiceStart;
  savedObjects: InternalSavedObjectsServiceStart;
  uiSettings: InternalUiSettingsServiceStart;
  deprecations: InternalDeprecationsServiceStart;
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

  constructor(coreStart: CoreRouteHandlerContextParams, request: KibanaRequest) {
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
