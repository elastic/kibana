/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandlerContextBase } from '..';
import type { IRouter } from '../http';
import type { ElasticsearchRequestHandlerContext } from '../elasticsearch';
import type { SavedObjectsRequestHandlerContext } from './saved_objects_route_handler_context';

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
