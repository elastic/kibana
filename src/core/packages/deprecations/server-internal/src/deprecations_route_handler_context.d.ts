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
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InternalDeprecationsServiceStart } from './deprecations_service';
/**
 * The {@link DeprecationsRequestHandlerContext} implementation.
 * @internal
 */
export declare class CoreDeprecationsRouteHandlerContext
  implements DeprecationsRequestHandlerContext
{
  #private;
  private readonly deprecationsStart;
  private readonly elasticsearchRouterHandlerContext;
  private readonly savedObjectsRouterHandlerContext;
  private readonly request;
  constructor(
    deprecationsStart: InternalDeprecationsServiceStart,
    elasticsearchRouterHandlerContext: CoreElasticsearchRouteHandlerContext,
    savedObjectsRouterHandlerContext: CoreSavedObjectsRouteHandlerContext,
    request: KibanaRequest
  );
  get client(): DeprecationsClient;
}
