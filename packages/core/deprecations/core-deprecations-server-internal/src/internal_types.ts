/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter, RequestHandlerContextBase } from '@kbn/core-http-server';
import type { DeprecationsRequestHandlerContext } from '@kbn/core-deprecations-server';

/**
 * Request handler context used by core's deprecations routes.
 * @internal
 */
export interface InternalDeprecationRequestHandlerContext extends RequestHandlerContextBase {
  core: Promise<{ deprecations: DeprecationsRequestHandlerContext }>;
}

/**
 * Router bound to the {@link InternalDeprecationRequestHandlerContext}.
 * Used by core's deprecations routes.
 * @internal
 */
export type InternalDeprecationRouter = IRouter<InternalDeprecationRequestHandlerContext>;
