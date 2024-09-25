/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreElasticsearchRouteHandlerContext } from '@kbn/core-elasticsearch-server-internal';
import type { CoreSavedObjectsRouteHandlerContext } from '@kbn/core-saved-objects-server-internal';
import type {
  DeprecationsRequestHandlerContext,
  DeprecationsClient,
} from '@kbn/core-deprecations-server';
import type { InternalDeprecationsServiceStart } from './deprecations_service';

/**
 * The {@link DeprecationsRequestHandlerContext} implementation.
 * @internal
 */
export class CoreDeprecationsRouteHandlerContext implements DeprecationsRequestHandlerContext {
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
