/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type RouteMethod,
  type SafeRouteMethod,
  type RouteConfig,
  type KibanaRequest,
  getRequestValidation,
} from '@kbn/core-http-server';
import type { RouteSecurityGetter, RouteSecurity } from '@kbn/core-http-server';
import type { Request } from '@hapi/hapi';
import { isConfigSchema } from '@kbn/config-schema';
import { isZod } from '@kbn/zod';
import type { Logger } from '@kbn/logging';
import { RequestHandlerEnhanced, Router } from './router';
import { CoreKibanaRequest } from './request';
import { RouteValidator } from './validator';
import { BASE_PUBLIC_VERSION } from './versioned_router';
import { kibanaResponseFactory } from './response';
import { getVersionHeader, injectVersionHeader, formatErrorMeta } from './util';

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

/** @internal */
interface InternalRouteHandlerArgs<P, Q, B, Method extends RouteMethod> {
  router: Router;
  route: InternalRouteConfig<P, Q, B, Method>;
  request: Request;
  log: Logger;
  handler: RequestHandlerEnhanced<P, Q, B, Method>;
}

/** @internal */
export async function handle<P, Q, B, Method extends RouteMethod>({
  router,
  route,
  request,
  handler,
  log,
}: InternalRouteHandlerArgs<P, Q, B, Method>) {
  const routeSchemas = routeSchemasFromRouteConfig(route, request.method as Method);

  let kibanaRequest: KibanaRequest<
    P,
    Q,
    B,
    typeof request.method extends RouteMethod ? typeof request.method : any
  >;
  try {
    kibanaRequest = CoreKibanaRequest.from(request, routeSchemas);
  } catch (error) {
    log.error('400 Bad Request', formatErrorMeta(400, { request, error }));
    const response = kibanaResponseFactory.badRequest({
      body: error.message,
      headers: isPublicAccessRoute(route) ? getVersionHeader(BASE_PUBLIC_VERSION) : undefined,
    });

    // Emit onPostValidation even if validation fails.
    const req = CoreKibanaRequest.from(request);
    router.emitPostValidate(req, {
      deprecated: req.route.options.deprecated,
      isInternalApiRequest: req.isInternalApiRequest,
      isPublicAccess: isPublicAccessRoute(route),
    });
    return response;
  }

  router.emitPostValidate(kibanaRequest, {
    deprecated: kibanaRequest.route.options.deprecated,
    isInternalApiRequest: kibanaRequest.isInternalApiRequest,
    isPublicAccess: isPublicAccessRoute(route),
  });

  const kibanaResponse = await handler(kibanaRequest, kibanaResponseFactory);

  if (isPublicAccessRoute(route)) {
    injectVersionHeader(BASE_PUBLIC_VERSION, kibanaResponse);
  }

  return kibanaResponse;
}

function isPublicAccessRoute<Method extends RouteMethod>({
  options,
}: InternalRouteConfig<unknown, unknown, unknown, Method>): boolean {
  return options?.access === 'public';
}

/**
 * Create the validation schemas for a route
 *
 * @returns Route schemas if `validate` is specified on the route, otherwise
 * undefined.
 */
function routeSchemasFromRouteConfig<P, Q, B>(
  route: InternalRouteConfig<P, Q, B, typeof routeMethod>,
  routeMethod: RouteMethod
) {
  // The type doesn't allow `validate` to be undefined, but it can still
  // happen when it's used from JavaScript.
  if (route.validate === undefined) {
    throw new Error(
      `The [${routeMethod}] at [${route.path}] does not have a 'validate' specified. Use 'false' as the value if you want to bypass validation.`
    );
  }

  if (route.validate !== false) {
    const validation = getRequestValidation(route.validate);
    Object.entries(validation).forEach(([key, schema]) => {
      if (!(isConfigSchema(schema) || isZod(schema) || typeof schema === 'function')) {
        throw new Error(
          `Expected a valid validation logic declared with '@kbn/config-schema' package, '@kbn/zod' package or a RouteValidationFunction at key: [${key}].`
        );
      }
    });
    return RouteValidator.from(validation);
  }
}
