/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, IRouter } from '@kbn/core/server';
import { ServerUrlService } from '../types';
import { registerCreateRoute } from './short_urls/register_create_route';
import { registerGetRoute } from './short_urls/register_get_route';
import { registerDeleteRoute } from './short_urls/register_delete_route';
import { registerResolveRoute } from './short_urls/register_resolve_route';
import { registerGotoRoute } from './short_urls/register_goto_route';

export const registerUrlServiceRoutes = (
  core: CoreSetup,
  router: IRouter,
  url: ServerUrlService
) => {
  registerCreateRoute(router, url);
  registerGetRoute(router, url);
  registerDeleteRoute(router, url);
  registerResolveRoute(router, url);
  registerGotoRoute(router, core);
};
