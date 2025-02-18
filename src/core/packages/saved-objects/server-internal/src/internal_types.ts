/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, RequestHandlerContextBase } from '@kbn/core-http-server';
import type { ElasticsearchRequestHandlerContext } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsRequestHandlerContext } from '@kbn/core-saved-objects-server';

/**
 * Request handler context used by core's savedObjects routes.
 * @internal
 */
export interface InternalSavedObjectsRequestHandlerContext extends RequestHandlerContextBase {
  core: Promise<{
    savedObjects: SavedObjectsRequestHandlerContext;
    elasticsearch: ElasticsearchRequestHandlerContext;
  }>;
}

/**
 * Router bound to the {@link InternalSavedObjectsRequestHandlerContext}.
 * Used by core's savedObjects routes.
 * @internal
 */
export type InternalSavedObjectRouter = IRouter<InternalSavedObjectsRequestHandlerContext>;
