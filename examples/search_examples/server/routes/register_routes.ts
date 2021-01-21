/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { IRouter, RequestHandlerContext } from 'kibana/server';
import { DataApiRequestHandlerContext } from 'src/plugins/data/server';
import { registerServerSearchRoute } from './server_search_route';

export function registerRoutes(
  router: IRouter<RequestHandlerContext & { search: DataApiRequestHandlerContext }>
) {
  registerServerSearchRoute(router);
}
