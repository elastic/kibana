/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalDeprecationRequestHandlerContext } from '../internal_types';
import { registerGetRoute } from './get';

export function registerRoutes({ http }: { http: InternalHttpServiceSetup }) {
  const router = http.createRouter<InternalDeprecationRequestHandlerContext>('/api/deprecations');
  registerGetRoute(router);
}
