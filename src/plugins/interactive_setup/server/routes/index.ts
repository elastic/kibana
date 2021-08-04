/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CorePreboot,
  IBasePath,
  IRouter,
  Logger,
  PluginInitializerContext,
} from 'src/core/server';

import type { ElasticsearchConnectionStatus } from '../../common';
import type { ConfigType } from '../config';
import { defineConfigureRoute } from './configure';
import { defineEnrollRoutes } from './enroll';
import { definePingRoute } from './ping';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  readonly router: IRouter;
  readonly basePath: IBasePath;
  readonly logger: Logger;
  readonly getConfig: () => ConfigType;
  readonly getElasticsearchConnectionStatus: () => ElasticsearchConnectionStatus;
  readonly core: CorePreboot;
  readonly initializerContext: PluginInitializerContext<ConfigType>;
  readonly completeSetup: (result: { shouldReloadConfig: boolean }) => void;
}

export function defineRoutes(params: RouteDefinitionParams) {
  defineConfigureRoute(params);
  defineEnrollRoutes(params);
  definePingRoute(params);
}
