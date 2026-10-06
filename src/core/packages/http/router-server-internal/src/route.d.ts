/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type RouteMethod, type SafeRouteMethod, type RouteConfig } from '@kbn/core-http-server';
import type {
  RouteSecurityGetter,
  RouteSecurity,
  AnyKibanaRequest,
  IKibanaResponse,
  OnRequestValidationError,
  RequestValidationError,
  RouteValidatorFullConfigResponse,
  KibanaResponseFactory,
  RouteConfigOptions,
} from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { Request } from '@hapi/hapi';
import type { InternalRouterRoute, RequestHandlerEnhanced, Router } from './router';
import type { RouteValidator } from './validator';
export declare function isSafeMethod(method: RouteMethod): method is SafeRouteMethod;
/** @interval */
export type InternalRouteConfig<P, Q, B, M extends RouteMethod> = Omit<
  RouteConfig<P, Q, B, M>,
  'security'
> & {
  security?: RouteSecurityGetter | RouteSecurity;
};
/** @internal */
interface Dependencies {
  router: Router;
  route: InternalRouteConfig<unknown, unknown, unknown, RouteMethod>;
  handler: RequestHandlerEnhanced<unknown, unknown, unknown, RouteMethod>;
  log: Logger;
  method: RouteMethod;
  /** @default false */
  isDev?: boolean;
}
export declare function buildRoute({
  handler,
  log,
  route,
  router,
  method,
  isDev,
}: Dependencies): InternalRouterRoute;
/** @internal */
interface HandlerDependencies extends Dependencies {
  routeSchemas?: RouteValidator<unknown, unknown, unknown>;
  onRequestValidationError?: OnRequestValidationError;
  responseValidation?: RouteValidatorFullConfigResponse;
}
type RouteInfo = Pick<RouteConfigOptions<RouteMethod>, 'access' | 'httpResource' | 'deprecated'>;
interface ValidationContext {
  routeInfo: RouteInfo;
  router: Router;
  log: Logger;
  routeSchemas?: RouteValidator<unknown, unknown, unknown>;
  version?: string;
  shouldLogDefaultValidationError?: boolean;
}
interface ValidationFailure {
  error: RequestValidationError;
  request: AnyKibanaRequest;
}
/** @internal */
export declare function validateHapiRequest(
  request: Request,
  {
    routeInfo,
    router,
    log,
    routeSchemas,
    version,
    shouldLogDefaultValidationError,
  }: ValidationContext
):
  | {
      ok: AnyKibanaRequest;
      error?: never;
    }
  | {
      ok?: never;
      error: {
        response: IKibanaResponse;
        validationFailure: ValidationFailure;
      };
    };
/** @internal */
export declare const handle: (
  request: Request,
  {
    router,
    route,
    handler,
    routeSchemas,
    onRequestValidationError,
    responseValidation,
    log,
    isDev,
  }: HandlerDependencies
) => Promise<IKibanaResponse<any>>;
export declare function handleRequestValidationFailure({
  failure,
  defaultResponse,
  hapiRequest,
  onRequestValidationError,
  responseFactory,
  log,
  isDev,
  validateResponse,
}: {
  failure: ValidationFailure;
  defaultResponse: IKibanaResponse;
  hapiRequest: Request;
  onRequestValidationError?: OnRequestValidationError;
  responseFactory: KibanaResponseFactory;
  log: Logger;
  isDev: boolean;
  validateResponse?: (response: IKibanaResponse) => string | undefined;
}): Promise<IKibanaResponse>;
export declare function logRequestValidationError(
  log: Logger,
  request: Request,
  statusCode: number,
  rawError: unknown
): void;
export {};
