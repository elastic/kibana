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
  getRequestValidation,
} from '@kbn/core-http-server';
import type {
  RouteSecurityGetter,
  RouteSecurity,
  AnyKibanaRequest,
  IKibanaResponse,
  RouteAccess,
  RouteConfigOptions,
  PostValidationMetadata,
} from '@kbn/core-http-server';
import { isConfigSchema } from '@kbn/config-schema';
import { isZod } from '@kbn/zod';
import type { Logger } from '@kbn/logging';
import type { DeepPartial } from '@kbn/utility-types';
import { Request } from '@hapi/hapi';
import { Mutable } from 'utility-types';
import type { InternalRouterRoute, RequestHandlerEnhanced, Router } from './router';
import { CoreKibanaRequest } from './request';
import { RouteValidator } from './validator';
import { BASE_PUBLIC_VERSION } from './versioned_router';
import { kibanaResponseFactory } from './response';
import {
  getVersionHeader,
  injectVersionHeader,
  formatErrorMeta,
  getRouteFullPath,
  validOptions,
  prepareRouteConfigValidation,
} from './util';
import { validRouteSecurity } from './security_route_config_validator';

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
interface Dependencies {
  router: Router;
  route: InternalRouteConfig<unknown, unknown, unknown, RouteMethod>;
  handler: RequestHandlerEnhanced<unknown, unknown, unknown, RouteMethod>;
  log: Logger;
  method: RouteMethod;
}

export function buildRoute({
  handler,
  log,
  route,
  router,
  method,
}: Dependencies): InternalRouterRoute {
  route = prepareRouteConfigValidation(route);
  const routeSchemas = routeSchemasFromRouteConfig(route, method);
  return {
    handler: async (req) => {
      return await handle(req, {
        handler,
        log,
        method,
        route,
        router,
        routeSchemas,
      });
    },
    method,
    path: getRouteFullPath(router.routerPath, route.path),
    options: validOptions(method, route),
    security: validRouteSecurity(route.security as DeepPartial<RouteSecurity>, route.options),
    validationSchemas: route.validate,
    isVersioned: false,
  };
}

/** @internal */
interface HandlerDependencies extends Dependencies {
  routeSchemas?: RouteValidator<unknown, unknown, unknown>;
}

type RouteInfo = Pick<RouteConfigOptions<RouteMethod>, 'access' | 'httpResource' | 'deprecated'>;

interface ValidationContext {
  routeInfo: RouteInfo;
  router: Router;
  log: Logger;
  routeSchemas?: RouteValidator<unknown, unknown, unknown>;
  version?: string;
}

/** @internal */
export function validateHapiRequest(
  request: Request,
  { routeInfo, router, log, routeSchemas, version }: ValidationContext
): { ok: AnyKibanaRequest; error?: never } | { ok?: never; error: IKibanaResponse } {
  let kibanaRequest: Mutable<AnyKibanaRequest>;
  try {
    kibanaRequest = CoreKibanaRequest.from(request, routeSchemas);
    kibanaRequest.apiVersion = version;
  } catch (error) {
    kibanaRequest = CoreKibanaRequest.from(request);
    kibanaRequest.apiVersion = version;

    log.error('400 Bad Request', formatErrorMeta(400, { request, error }));

    const response = kibanaResponseFactory.badRequest({
      body: error.message,
      headers: isPublicAccessApiRoute(routeInfo)
        ? getVersionHeader(BASE_PUBLIC_VERSION)
        : undefined,
    });
    return { error: response };
  } finally {
    router.emitPostValidate(
      kibanaRequest!,
      getPostValidateEventMetadata(kibanaRequest!, routeInfo)
    );
  }

  return { ok: kibanaRequest };
}

/** @internal */
export const handle = async (
  request: Request,
  { router, route, handler, routeSchemas, log }: HandlerDependencies
) => {
  const { error, ok: kibanaRequest } = validateHapiRequest(request, {
    routeInfo: {
      access: route.options?.access,
      httpResource: route.options?.httpResource,
      deprecated: route.options?.deprecated,
    },
    router,
    log,
    routeSchemas,
  });
  if (error) {
    return error;
  }
  const kibanaResponse = await handler(kibanaRequest, kibanaResponseFactory);
  if (isPublicAccessApiRoute(route.options)) {
    injectVersionHeader(BASE_PUBLIC_VERSION, kibanaResponse);
  }
  return kibanaResponse;
};

function isPublicAccessApiRoute({
  access,
  httpResource,
}: {
  access?: RouteAccess;
  httpResource?: boolean;
} = {}): boolean {
  return !httpResource && access === 'public';
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

function getPostValidateEventMetadata(
  request: AnyKibanaRequest,
  routeInfo: RouteInfo
): PostValidationMetadata {
  return {
    deprecated: routeInfo.deprecated,
    isInternalApiRequest: request.isInternalApiRequest,
    isPublicAccess: routeInfo.access === 'public',
  };
}
