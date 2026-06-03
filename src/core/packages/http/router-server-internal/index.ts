/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { filterHeaders } from './src/headers';
export {
  versionHandlerResolvers,
  CoreVersionedRouter,
  BASE_PUBLIC_VERSION,
  unwrapVersionedResponseBodyValidation,
  type HandlerResolutionStrategy,
} from './src/versioned_router';
export { Router, INTERNAL_ROUTE_HANDLER, getInternalRouteHandler } from './src/router';
export type { RouterOptions, InternalRouteHandler } from './src/router';
export {
  isKibanaRequest,
  isRealRequest,
  ensureRawRequest,
  CoreKibanaRequest,
  type FrameworkRawRequest,
} from './src/request';
export { isSafeMethod } from './src/route';
export { HapiResponseAdapter } from './src/response_adapter';
export { kibanaResponseFactory, lifecycleResponseFactory, KibanaResponse } from './src/response';
export { getWarningHeaderMessageFromRouteDeprecation } from './src/get_warning_header_message';
export { formatErrorMeta } from './src/util';
