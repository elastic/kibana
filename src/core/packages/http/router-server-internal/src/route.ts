/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteMethod, SafeRouteMethod, RouteConfig } from '@kbn/core-http-server';
import type { RouteSecurityGetter, RouteSecurity } from '@kbn/core-http-server';

export function isSafeMethod(method: RouteMethod): method is SafeRouteMethod {
  return method === 'get' || method === 'options';
}

/** @interval */
export type InternalRouteConfig<P, Q, B, M extends RouteMethod> = Omit<
  RouteConfig<P, Q, B, M>,
  'security'
> & {
  security?: RouteSecurityGetter | RouteSecurity;
};
