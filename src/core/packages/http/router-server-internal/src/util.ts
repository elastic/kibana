/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import {
  isFullValidatorContainer,
  type RouteValidatorFullConfigResponse,
  type RouteMethod,
  type RouteValidator,
  getRequestValidation,
  validBodyOutput,
} from '@kbn/core-http-server';
import type { Mutable } from 'utility-types';
import type { IKibanaResponse, ResponseHeaders, SafeRouteMethod } from '@kbn/core-http-server';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { Request } from '@hapi/hapi';
import type { InternalRouteConfig } from './route';

function isStatusCode(key: string) {
  return !isNaN(parseInt(key, 10));
}

export function prepareResponseValidation(
  validation: RouteValidatorFullConfigResponse
): RouteValidatorFullConfigResponse {
  const responses = Object.entries(validation).map(([key, value]) => {
    if (isStatusCode(key)) {
      return [key, { ...value, ...(value.body ? { body: once(value.body) } : {}) }];
    }
    return [key, value];
  });

  return Object.fromEntries(responses);
}

function prepareValidation<P, Q, B>(validator: RouteValidator<P, Q, B>) {
  if (isFullValidatorContainer(validator) && validator.response) {
    return {
      ...validator,
      response: prepareResponseValidation(validator.response),
    };
  }
  return validator;
}

// Integration tested in ./routes.test.ts
export function prepareRouteConfigValidation<P, Q, B>(
  config: InternalRouteConfig<P, Q, B, RouteMethod>
): InternalRouteConfig<P, Q, B, RouteMethod> {
  // Calculating schema validation can be expensive so when it is provided lazily
  // we only want to instantiate it once. This also provides idempotency guarantees
  if (typeof config.validate === 'function') {
    const validate = config.validate;
    return {
      ...config,
      validate: once(() => prepareValidation(validate())),
    };
  } else if (typeof config.validate === 'object' && typeof config.validate !== null) {
    return {
      ...config,
      validate: prepareValidation(config.validate),
    };
  }
  return config;
}

/**
 * @note mutates the response object
 * @internal
 */
export function injectResponseHeaders(
  headers: ResponseHeaders,
  response: IKibanaResponse
): IKibanaResponse {
  const mutableResponse = response as Mutable<IKibanaResponse>;
  mutableResponse.options.headers = {
    ...mutableResponse.options.headers,
    ...headers,
  };
  return mutableResponse;
}

export function getVersionHeader(version: string): ResponseHeaders {
  return {
    [ELASTIC_HTTP_VERSION_HEADER]: version,
  };
}

export function injectVersionHeader(version: string, response: IKibanaResponse): IKibanaResponse {
  return injectResponseHeaders(getVersionHeader(version), response);
}

export function formatErrorMeta(
  statusCode: number,
  {
    error,
    request,
  }: {
    error: Error;
    request: Request;
  }
) {
  return {
    http: {
      response: { status_code: statusCode },
      request: { method: request.route?.method, path: request.route?.path },
    },
    error: { message: error.message },
  };
}

export function getRouteFullPath(routerPath: string, routePath: string) {
  // If router's path ends with slash and route's path starts with slash,
  // we should omit one of them to have a valid concatenated path.
  const routePathStartIndex = routerPath.endsWith('/') && routePath.startsWith('/') ? 1 : 0;
  return `${routerPath}${routePath.slice(routePathStartIndex)}`;
}

export function isSafeMethod(method: RouteMethod): method is SafeRouteMethod {
  return method === 'get' || method === 'options';
}

/**
 * Create a valid options object with "sensible" defaults + adding some validation to the options fields
 *
 * @param method HTTP verb for these options
 * @param routeConfig The route config definition
 */
export function validOptions(
  method: RouteMethod,
  routeConfig: InternalRouteConfig<unknown, unknown, unknown, typeof method>
) {
  const shouldNotHavePayload = ['head', 'get'].includes(method);
  const { options = {}, validate } = routeConfig;
  const shouldValidateBody = (validate && !!getRequestValidation(validate).body) || !!options.body;

  const { output } = options.body || {};
  if (typeof output === 'string' && !validBodyOutput.includes(output)) {
    throw new Error(
      `[options.body.output: '${output}'] in route ${method.toUpperCase()} ${
        routeConfig.path
      } is not valid. Only '${validBodyOutput.join("' or '")}' are valid.`
    );
  }

  // @ts-expect-error to eliminate problems with `security` in the options for route factories abstractions
  if (options.security) {
    throw new Error('`options.security` is not allowed in route config. Use `security` instead.');
  }

  const body = shouldNotHavePayload
    ? undefined
    : {
        // If it's not a GET (requires payload) but no body validation is required (or no body options are specified),
        // We assume the route does not care about the body => use the memory-cheapest approach (stream and no parsing)
        output: !shouldValidateBody ? ('stream' as const) : undefined,
        parse: !shouldValidateBody ? false : undefined,

        // User's settings should overwrite any of the "desired" values
        ...options.body,
      };

  return { ...options, body };
}
