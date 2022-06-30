/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandlerContextBase } from '..';
import type { DeprecationsRequestHandlerContext } from './deprecations_route_handler_context';

/**
 * Request handler context only defining `core.deprecations`.
 * Only used for module isolation purposes.
 * @internal
 */
export interface InternalDeprecationRequestHandlerContext extends RequestHandlerContextBase {
  core: Promise<{ deprecations: DeprecationsRequestHandlerContext }>;
}
