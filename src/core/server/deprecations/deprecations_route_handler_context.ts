/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreElasticsearchRouteHandlerContext } from '../elasticsearch';
import type { CoreSavedObjectsRouteHandlerContext } from '../saved_objects';
import type { DeprecationsClient, InternalDeprecationsServiceStart } from './deprecations_service';

/**
 * The deprecations core route handler sub-context.
 * @internal
 */
export class CoreDeprecationsRouteHandlerContext {
  #client?: DeprecationsClient;

  constructor(
    private readonly deprecationsStart: InternalDeprecationsServiceStart,
    private readonly elasticsearchRouterHandlerContext: CoreElasticsearchRouteHandlerContext,
    private readonly savedObjectsRouterHandlerContext: CoreSavedObjectsRouteHandlerContext
  ) {}

  public get client() {
    if (this.#client == null) {
      this.#client = this.deprecationsStart.asScopedToClient(
        this.elasticsearchRouterHandlerContext.client,
        this.savedObjectsRouterHandlerContext.client
      );
    }
    return this.#client;
  }
}
