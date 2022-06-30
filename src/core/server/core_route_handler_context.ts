/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { InternalCoreStart } from './internal_types';
import type { KibanaRequest } from './http';
import { CoreSavedObjectsRouteHandlerContext } from './saved_objects';
import { CoreElasticsearchRouteHandlerContext } from './elasticsearch';
import { CoreUiSettingsRouteHandlerContext } from './ui_settings';
import { CoreDeprecationsRouteHandlerContext } from './deprecations';

/**
 * The concrete implementation for Core's route handler context.
 *
 * @internal
 */
export class CoreRouteHandlerContext {
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
