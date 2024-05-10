/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { filterHeaders } from './src/headers';
export {
  versionHandlerResolvers,
  CoreVersionedRouter,
  ALLOWED_PUBLIC_VERSION,
  unwrapVersionedResponseBodyValidation,
  type VersionedRouterRoute,
  type HandlerResolutionStrategy,
} from './src/versioned_router';
export { Router } from './src/router';
export type {
  RouterOptions,
  InternalRegistrar,
  InternalRegistrarOptions,
  InternalRouterRoute,
} from './src/router';
export { isKibanaRequest, isRealRequest, ensureRawRequest, CoreKibanaRequest } from './src/request';
export { isSafeMethod } from './src/route';
export { HapiResponseAdapter } from './src/response_adapter';
export { kibanaResponseFactory, lifecycleResponseFactory, KibanaResponse } from './src/response';
