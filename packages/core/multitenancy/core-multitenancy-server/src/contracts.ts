/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { TenantConfig } from './config_types';

/** @public **/
export interface MultitenancyApi {
  /** */
  getTenantIds(): string[];

  /** */
  getTenantConfig(tenantId: string): TenantConfig;

  /** */
  getTenantIdFromRequest(request: KibanaRequest): string;
}

/** @public **/
export type MultitenancyServiceSetup = MultitenancyApi & {
  registerTenantResolver(resolver: TenantResolver): void;
};

/** @public **/
export type MultitenancyServiceStart = MultitenancyApi;

/**
 * Function returning the tenant bound to a given request.
 * @public
 **/
export type TenantResolver = (request: KibanaRequest) => string | undefined;
