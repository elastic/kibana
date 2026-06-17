/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IBasePath, IRouter, Logger } from '@kbn/core/server';
import type { PrebootServicePreboot } from '@kbn/core-preboot-server';
import type { PublicContract, PublicMethodsOf } from '@kbn/utility-types';

import { defineConfigureRoute } from './configure';
import { defineEnrollRoutes } from './enroll';
import { definePingRoute } from './ping';
import { defineStatusRoute } from './status';
import { defineVerifyRoute } from './verify';
import type { ConfigType } from '../config';
import type { ElasticsearchServiceSetup } from '../elasticsearch_service';
import type { KibanaConfigWriter } from '../kibana_config_writer';
import type { VerificationCode } from '../verification_code';

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
  readonly verificationCode: PublicContract<VerificationCode>;
  readonly getConfig: () => ConfigType;
}

export function defineRoutes(params: RouteDefinitionParams) {
  defineConfigureRoute(params);
  defineEnrollRoutes(params);
  definePingRoute(params);
  defineVerifyRoute(params);
  defineStatusRoute(params);
}
