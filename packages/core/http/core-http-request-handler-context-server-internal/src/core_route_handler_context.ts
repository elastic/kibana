/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Env } from '@kbn/config';
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
  env: Pick<Env, 'mode'>;
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
  readonly env: Pick<Env, 'mode'>;

  constructor(deps: CoreRouteHandlerContextParams, request: KibanaRequest) {
    this.elasticsearch = new CoreElasticsearchRouteHandlerContext(deps.elasticsearch, request);
    this.savedObjects = new CoreSavedObjectsRouteHandlerContext(deps.savedObjects, request);
    this.uiSettings = new CoreUiSettingsRouteHandlerContext(deps.uiSettings, this.savedObjects);
    this.deprecations = new CoreDeprecationsRouteHandlerContext(
      deps.deprecations,
      this.elasticsearch,
      this.savedObjects
    );
    this.env = { mode: deps.env.mode };
  }
}
