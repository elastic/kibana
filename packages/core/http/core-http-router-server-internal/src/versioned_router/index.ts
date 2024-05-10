/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export { resolvers as versionHandlerResolvers } from './handler_resolvers';
export { CoreVersionedRouter } from './core_versioned_router';
export type { HandlerResolutionStrategy, VersionedRouterRoute } from './types';
export { ALLOWED_PUBLIC_VERSION } from './route_version_utils';
export { unwrapVersionedResponseBodyValidation } from './util';
