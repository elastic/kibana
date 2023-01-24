/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter } from '@kbn/core/server';
import type { GuidesConfig } from '../../common/types';
import { registerActivateGuideRoute, registerGetGuideStateRoute } from './guide_state.routes';
import { registerGetPluginStateRoute, registerPutPluginStateRoute } from './plugin_state.routes';
import { registerGetConfigRoute } from './config.routes';

export function defineRoutes(router: IRouter, guidesConfig: GuidesConfig) {
  registerGetGuideStateRoute(router);
  registerActivateGuideRoute(router, guidesConfig);

  registerGetPluginStateRoute(router);
  registerPutPluginStateRoute(router);

  registerGetConfigRoute(router, guidesConfig);
}
