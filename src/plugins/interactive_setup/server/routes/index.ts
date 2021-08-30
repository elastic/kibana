/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { IBasePath, IRouter, Logger, PrebootServicePreboot } from 'src/core/server';

import type { ConfigType } from '../config';
import type { ElasticsearchServiceSetup } from '../elasticsearch_service';
import type { KibanaConfigWriter } from '../kibana_config_writer';
import { defineEnrollRoutes } from './enroll';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  readonly router: IRouter;
  readonly basePath: IBasePath;
  readonly logger: Logger;
  readonly preboot: PrebootServicePreboot & {
    completeSetup: (result: { shouldReloadConfig: boolean }) => void;
  };
  readonly kibanaConfigWriter: PublicMethodsOf<KibanaConfigWriter>;
  readonly elasticsearch: ElasticsearchServiceSetup;
  readonly getConfig: () => ConfigType;
}

export function defineRoutes(params: RouteDefinitionParams) {
  defineEnrollRoutes(params);
}
