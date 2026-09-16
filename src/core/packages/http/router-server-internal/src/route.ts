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
  getResponseValidation,
  isFullValidatorContainer,
} from '@kbn/core-http-server';
import type {
  RouteSecurityGetter,
  RouteSecurity,
  AnyKibanaRequest,
  IKibanaResponse,
  OnRequestValidationError,
  RequestValidationError,
  RouteValidatorFullConfigResponse,
  KibanaResponseFactory,
  RouteAccess,
  RouteConfigOptions,
  PostValidationMetadata,
} from '@kbn/core-http-server';
import { isConfigSchema } from '@kbn/config-schema';
import { isZod } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
import type { DeepPartial } from '@kbn/utility-types';
import type { Request } from '@hapi/hapi';
import type { Mutable } from 'utility-types';
import { onceCacheOnSuccess } from '@kbn/std';
import type { InternalRouterRoute, RequestHandlerEnhanced, Router } from './router';
import { CoreKibanaRequest } from './request';
import { RequestValidationFailure } from './request_validation_failure';
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
  /** @default false */
  isDev?: boolean;
}

export function buildRoute({
  handler,
  log,
  route,
  router,
  method,
  isDev,
}: Dependencies): InternalRouterRoute {
  route = prepareRouteConfigValidation(route);
  const validations = buildLazyValidationGetters({ route, method, isDev });

  return {
    handler: async (req) => {
      return await handle(req, {
        handler,
        log,
        method,
        route,
        router,
        routeSchemas: validations.routeValidator(),
        onRequestValidationError: validations.onRequestValidationError(),
        responseValidation: validations.responseValidation(),
        isDev,
      });
    },
    method,
    path: getRouteFullPath(router.routerPath, route.path),
    options: validOptions(method, route),
    security: validRouteSecurity(route.security as DeepPartial<RouteSecurity>),
    validationSchemas: route.validate,
    isVersioned: false,
  };
}

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
export function validateHapiRequest(
  request: Request,
  {
    routeInfo,
    router,
    log,
    routeSchemas,
    version,
    shouldLogDefaultValidationError = true,
  }: ValidationContext
):
  | { ok: AnyKibanaRequest; error?: never }
  | { ok?: never; error: { response: IKibanaResponse; validationFailure: ValidationFailure } } {
  let kibanaRequest: Mutable<AnyKibanaRequest>;
  try {
    kibanaRequest = CoreKibanaRequest.from(request, routeSchemas) as Mutable<AnyKibanaRequest>;
    kibanaRequest.apiVersion = version;
  } catch (error) {
    kibanaRequest = CoreKibanaRequest.from(request) as Mutable<AnyKibanaRequest>;
    kibanaRequest.apiVersion = version;

    const validationError = normalizeRequestValidationError(error);

    const response = kibanaResponseFactory.badRequest({
      body: validationError.message,
      headers: isPublicAccessApiRoute(routeInfo)
        ? getVersionHeader(BASE_PUBLIC_VERSION)
        : undefined,
    });
    if (shouldLogDefaultValidationError) {
      log.error('400 Bad Request', formatErrorMeta(400, { request, error }));
    }
    return {
      error: {
        response,
        validationFailure: { error: validationError, request: kibanaRequest },
      },
    };
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
  {
    router,
    route,
    handler,
    routeSchemas,
    onRequestValidationError = getRouteOnRequestValidationError(route),
    responseValidation = getRouteResponseValidation(route),
    log,
    isDev = false,
  }: HandlerDependencies
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
    shouldLogDefaultValidationError: !onRequestValidationError,
  });
  if (error) {
    const customResponse = await handleRequestValidationFailure({
      failure: error.validationFailure,
      defaultResponse: error.response,
      hapiRequest: request,
      onRequestValidationError,
      responseFactory: kibanaResponseFactory,
      log,
      isDev,
      validateResponse: responseValidation
        ? (response) => validateOnRequestValidationErrorResponse(responseValidation, response)
        : undefined,
    });
    if (isPublicAccessApiRoute(route.options)) {
      injectVersionHeader(BASE_PUBLIC_VERSION, customResponse);
    }
    return customResponse;
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

function normalizeRequestValidationError(rawError: unknown): RequestValidationError {
  if (rawError instanceof RequestValidationFailure) {
    return {
      message: rawError.message,
      source: rawError.source,
      rawError: rawError.rawError,
    };
  }

  const message = rawError instanceof Error ? rawError.message : String(rawError);
  return {
    message,
    source: 'unknown',
    rawError,
  };
}

export async function handleRequestValidationFailure({
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
}): Promise<IKibanaResponse> {
  if (!onRequestValidationError) {
    return defaultResponse;
  }

  const customResponse = await onRequestValidationError(
    failure.error,
    failure.request,
    responseFactory
  );
  const validationErrorMessage = isDev ? validateResponse?.(customResponse) : undefined;
  if (validationErrorMessage) {
    return responseFactory.custom({
      statusCode: 500,
      body: `Failed output validation: ${validationErrorMessage}`,
    });
  }
  logRequestValidationError(log, hapiRequest, customResponse.status, failure.error.rawError);
  return customResponse;
}

export function logRequestValidationError(
  log: Logger,
  request: Request,
  statusCode: number,
  rawError: unknown
) {
  const error = rawError instanceof Error ? rawError : new Error(String(rawError));
  log.error(
    `${statusCode} Request Validation Error`,
    formatErrorMeta(statusCode, { request, error })
  );
}

function validateOnRequestValidationErrorResponse(
  responseValidation: RouteValidatorFullConfigResponse | undefined,
  response: IKibanaResponse
): string | undefined {
  const validation = responseValidation?.[response.status];
  if (!validation) {
    return `No response validation defined for status code [${response.status}] in 'validate.response'.`;
  }
  if (!validation.body) {
    return undefined;
  }

  try {
    const { unsafe } = responseValidation;
    const validator = RouteValidator.from({
      body: validation.body(),
      unsafe: { body: unsafe?.body },
    });
    validator.getBody(response.payload, 'response body');
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
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

/**
 * In development, build schemas eagerly at registration time so config errors
 * surface immediately at plugin.setup(). In production, defer to first request
 * to avoid loading all schemas into memory upfront.
 */
function buildLazyValidationGetters({
  route,
  method,
  isDev,
}: {
  route: InternalRouteConfig<unknown, unknown, unknown, RouteMethod>;
  method: RouteMethod;
  isDev?: boolean;
}): {
  routeValidator: () => RouteValidator<unknown, unknown, unknown> | undefined;
  onRequestValidationError: () => OnRequestValidationError | undefined;
  responseValidation: () => RouteValidatorFullConfigResponse | undefined;
} {
  if (isDev) {
    // Eager path — build immediately, throw at registration if invalid
    const routeValidator = routeSchemasFromRouteConfig(route, method);
    const onRequestValidationError = getRouteOnRequestValidationError(route);
    const responseValidation = getRouteResponseValidation(route);
    return {
      routeValidator: () => routeValidator,
      onRequestValidationError: () => onRequestValidationError,
      responseValidation: () => responseValidation,
    };
  } else {
    // Deferred path (production) — schema construction on first request.
    // Use onceCacheOnSuccess to ensure a broken schema retries on every request
    // rather than silently bypassing validation after the first failure.
    return {
      routeValidator: onceCacheOnSuccess(() => routeSchemasFromRouteConfig(route, method)),
      onRequestValidationError: onceCacheOnSuccess(() => getRouteOnRequestValidationError(route)),
      responseValidation: onceCacheOnSuccess(() => getRouteResponseValidation(route)),
    };
  }
}

function getRouteOnRequestValidationError<P, Q, B>(
  route: InternalRouteConfig<P, Q, B, RouteMethod>
): OnRequestValidationError | undefined {
  if (!route.validate) {
    return undefined;
  }
  const validate = typeof route.validate === 'function' ? route.validate() : route.validate;
  return isFullValidatorContainer(validate) ? validate.onRequestValidationError : undefined;
}

function getRouteResponseValidation<P, Q, B>(
  route: InternalRouteConfig<P, Q, B, RouteMethod>
): RouteValidatorFullConfigResponse | undefined {
  if (!route.validate) {
    return undefined;
  }
  return getResponseValidation(route.validate);
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
