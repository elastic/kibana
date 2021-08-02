/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CorePreboot, IRouter, Logger, PluginInitializerContext } from 'src/core/server';

import { defineEnrollRoute } from './enroll';
import { defineConfigureRoute } from './configure';
import type { ConfigType } from '../config';

export interface RouteDefinitionParams {
  router: IRouter;
  core: CorePreboot;
  initializerContext: PluginInitializerContext<ConfigType>;
  logger: Logger;
  completeSetup: (result: { shouldReloadConfig: boolean }) => void;
}

export function defineRoutes(params: RouteDefinitionParams) {
  defineEnrollRoute(params);
  defineConfigureRoute(params);
}
