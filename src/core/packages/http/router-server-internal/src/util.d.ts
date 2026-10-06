/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type RouteValidatorFullConfigResponse, type RouteMethod } from '@kbn/core-http-server';
import type { IKibanaResponse, ResponseHeaders, SafeRouteMethod } from '@kbn/core-http-server';
import type { Request } from '@hapi/hapi';
import type { InternalRouteConfig } from './route';
export declare function prepareResponseValidation(
  validation: RouteValidatorFullConfigResponse
): RouteValidatorFullConfigResponse;
export declare function prepareRouteConfigValidation<P, Q, B>(
  config: InternalRouteConfig<P, Q, B, RouteMethod>
): InternalRouteConfig<P, Q, B, RouteMethod>;
/**
 * @note mutates the response object
 * @internal
 */
export declare function injectResponseHeaders(
  headers: ResponseHeaders,
  response: IKibanaResponse
): IKibanaResponse;
export declare function getVersionHeader(version: string): ResponseHeaders;
export declare function injectVersionHeader(
  version: string,
  response: IKibanaResponse
): IKibanaResponse;
export declare function formatErrorMeta(
  statusCode: number,
  {
    error,
    request,
  }: {
    error: Error;
    request: Request;
  }
): {
  http: {
    response: {
      status_code: number;
    };
    request: {
      method:
        | '*'
        | 'acl'
        | 'bind'
        | 'checkout'
        | 'connect'
        | 'copy'
        | 'delete'
        | 'get'
        | 'link'
        | 'lock'
        | 'm-search'
        | 'merge'
        | 'mkactivity'
        | 'mkcalendar'
        | 'mkcol'
        | 'move'
        | 'notify'
        | 'options'
        | 'patch'
        | 'post'
        | 'propfind'
        | 'proppatch'
        | 'purge'
        | 'put'
        | 'rebind'
        | 'report'
        | 'search'
        | 'source'
        | 'subscribe'
        | 'trace'
        | 'unbind'
        | 'unlink'
        | 'unlock'
        | 'unsubscribe';
      path: string;
    };
  };
  error: {
    message: string;
  };
};
export declare function getRouteFullPath(routerPath: string, routePath: string): string;
export declare function isSafeMethod(method: RouteMethod): method is SafeRouteMethod;
/**
 * Create a valid options object with "sensible" defaults + adding some validation to the options fields
 *
 * @param method HTTP verb for these options
 * @param routeConfig The route config definition
 */
export declare function validOptions(
  method: RouteMethod,
  routeConfig: InternalRouteConfig<unknown, unknown, unknown, typeof method>
): {
  xsrfRequired?: boolean | undefined;
  access?: import('@kbn/core-http-server').RouteAccess;
  tags?: readonly string[];
  timeout?:
    | {
        payload?: number | undefined;
        idleSocket?: number;
      }
    | undefined;
  summary?: string;
  description?: string;
  deprecated?: import('@kbn/core-http-server').RouteDeprecationInfo;
  oasOperationObject?: import('@kbn/core/packages/http/server/src/router/route').OASOperationObjectProvider;
  operationId?: string;
  excludeFromOAS?: boolean;
  excludeFromRateLimiter?: boolean;
  discontinued?: string;
  httpResource?: boolean;
  httpResponseLogLevel?: 'info';
  availability?: {
    stability?: 'experimental' | 'stable' | 'tech_preview';
    since?: string;
  };
  body:
    | {
        accepts?:
          | import('@kbn/core-http-server').RouteContentType
          | import('@kbn/core-http-server').RouteContentType[]
          | string
          | string[];
        override?: string;
        maxBytes?: number;
        output: 'data' | 'stream' | undefined;
        parse: 'gunzip' | boolean | undefined;
      }
    | undefined;
};
