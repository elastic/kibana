/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AddVersionOpts,
  RequestHandler,
  RouteMethod,
  VersionedRouteConfig,
} from '@kbn/core-http-server';

export type Method = Exclude<RouteMethod, 'options'>;

/** @experimental */
export interface VersionedRouterRoute {
  /** @experimental */
  method: string;
  /** @experimental */
  path: string;
  /** @experimental */
  options: VersionedRouteConfig<RouteMethod>;
  /** @experimental */
  handlers: Array<{
    fn: RequestHandler;
    options: AddVersionOpts<unknown, unknown, unknown, unknown>;
  }>;
}
