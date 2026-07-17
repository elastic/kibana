/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom, { isBoom } from '@hapi/boom';
import type { Lifecycle, Request, ResponseToolkit } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { KibanaRouteOptions } from '@kbn/core-http-server';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

export const SELF_CALL_HEADER = 'x-kbn-self-call';
export const SELF_CALL_NOT_ALLOWED_CODE = 'SELF_CALL_NOT_ALLOWED';
export const SELF_CALL_NOT_ALLOWED_MESSAGE = 'Kibana self HTTP call is not allowed for this route.';
export const SELF_CALL_DISCOVERY_EVENT_ACTION = 'kibana_self_http_route_not_allowed';

export type SelfCallableEnforcementMode = 'observe' | 'enforce';

type GetSelfCallableEnforcement = () => boolean;

interface SelfCallDiscoveryState {
  readonly method: string;
  readonly routeTemplate: string;
  readonly apiVersion?: string;
  readonly mode: SelfCallableEnforcementMode;
}

const SELF_CALL_DISCOVERY_STATE = Symbol('selfCallDiscoveryState');
type RequestWithDiscoveryState = Request & {
  app: Request['app'] & { [SELF_CALL_DISCOVERY_STATE]?: SelfCallDiscoveryState };
};

const isSelfCall = (request: Request): boolean => request.headers[SELF_CALL_HEADER] !== undefined;

const isSelfCallable = (request: Request): boolean => {
  const routeOptions = request.route.settings.app as KibanaRouteOptions | undefined;
  return routeOptions?.selfCallable === true;
};

const getSafeApiVersion = (request: Request): string | undefined => {
  const apiVersion = request.headers[ELASTIC_HTTP_VERSION_HEADER];
  const version = Array.isArray(apiVersion) ? apiVersion[0] : apiVersion;
  return typeof version === 'string' &&
    (/^\d{4}-\d{2}-\d{2}$/.test(version) || /^\d{1,4}(?:\.\d{1,4}){0,2}$/.test(version))
    ? version
    : undefined;
};

const markForDiscovery = (request: Request, mode: SelfCallableEnforcementMode): void => {
  const requestWithState = request as RequestWithDiscoveryState;

  requestWithState.app[SELF_CALL_DISCOVERY_STATE] = {
    method: request.method.toUpperCase(),
    routeTemplate: request.route.path,
    apiVersion: getSafeApiVersion(request),
    mode,
  };
};

export const createSelfCallPreAuthHandler = (
  getEnforcement: GetSelfCallableEnforcement
): Lifecycle.Method => {
  return (request: Request, responseToolkit: ResponseToolkit) => {
    if (!getEnforcement() || !isSelfCall(request) || isSelfCallable(request)) {
      return responseToolkit.continue;
    }

    markForDiscovery(request, 'enforce');
    const error = Boom.forbidden(SELF_CALL_NOT_ALLOWED_MESSAGE);
    error.output.payload.attributes = { code: SELF_CALL_NOT_ALLOWED_CODE };
    return error;
  };
};

export const createSelfCallPreHandler = (
  getEnforcement: GetSelfCallableEnforcement
): Lifecycle.Method => {
  return (request: Request, responseToolkit: ResponseToolkit) => {
    if (!getEnforcement() && isSelfCall(request) && !isSelfCallable(request)) {
      markForDiscovery(request, 'observe');
    }

    return responseToolkit.continue;
  };
};

export const createSelfCallPreResponseHandler = (log: Logger): Lifecycle.Method => {
  return (request: Request, responseToolkit: ResponseToolkit) => {
    const requestWithState = request as RequestWithDiscoveryState;
    const discovery = requestWithState.app[SELF_CALL_DISCOVERY_STATE];
    if (!discovery) {
      return responseToolkit.continue;
    }

    delete requestWithState.app[SELF_CALL_DISCOVERY_STATE];
    const statusCode = isBoom(request.response)
      ? request.response.output.statusCode
      : request.response.statusCode;

    log.info('Kibana self HTTP call targeted a route that has not opted in', {
      event: { action: SELF_CALL_DISCOVERY_EVENT_ACTION },
      http: {
        request: { method: discovery.method },
        response: { status_code: statusCode },
      },
      labels: {
        self_http_route_template: discovery.routeTemplate,
        self_http_enforcement_mode: discovery.mode,
        self_http_status_class: `${Math.floor(statusCode / 100)}xx`,
        ...(discovery.apiVersion ? { self_http_api_version: discovery.apiVersion } : {}),
      },
    });

    return responseToolkit.continue;
  };
};
