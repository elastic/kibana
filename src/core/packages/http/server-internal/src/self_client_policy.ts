/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { Lifecycle, Request, ResponseToolkit } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { KibanaRouteOptions } from '@kbn/core-http-server';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

export const SELF_CALL_HEADER = 'x-kbn-self-call';
export const SELF_CALL_NOT_ALLOWED_CODE = 'SELF_CALL_NOT_ALLOWED';
export const SELF_CALL_NOT_ALLOWED_MESSAGE = 'Kibana self HTTP call is not allowed for this route.';
export const SELF_CALL_DISCOVERY_EVENT_ACTION = 'kibana_self_http_route_not_allowed';

export type SelfCallableEnforcementMode = 'observe' | 'enforce';

const isSelfCall = (request: Request): boolean => request.headers[SELF_CALL_HEADER] !== undefined;

const isSelfCallable = (request: Request): boolean => {
  const routeOptions = request.route.settings.app as KibanaRouteOptions | undefined;
  return routeOptions?.selfCallable === true;
};

const logNonOptedRoute = (
  request: Request,
  mode: SelfCallableEnforcementMode,
  log: Logger
): void => {
  const apiVersion = request.headers[ELASTIC_HTTP_VERSION_HEADER];
  const version = Array.isArray(apiVersion) ? apiVersion[0] : apiVersion;

  log.info('Kibana self HTTP call targeted a route that has not opted in', {
    event: { action: SELF_CALL_DISCOVERY_EVENT_ACTION },
    http: { request: { method: request.method.toUpperCase() } },
    labels: {
      self_http_route_template: request.route.path,
      self_http_enforcement_mode: mode,
      ...(version ? { self_http_api_version: version } : {}),
    },
  });
};

export const createSelfCallPreAuthHandler = (
  mode: SelfCallableEnforcementMode,
  log: Logger
): Lifecycle.Method => {
  return (request: Request, responseToolkit: ResponseToolkit) => {
    if (!isSelfCall(request) || isSelfCallable(request) || mode === 'observe') {
      return responseToolkit.continue;
    }

    logNonOptedRoute(request, mode, log);
    const error = Boom.forbidden(SELF_CALL_NOT_ALLOWED_MESSAGE);
    error.output.payload.attributes = { code: SELF_CALL_NOT_ALLOWED_CODE };
    return error;
  };
};

export const createSelfCallPreHandler = (
  mode: SelfCallableEnforcementMode,
  log: Logger
): Lifecycle.Method => {
  return (request: Request, responseToolkit: ResponseToolkit) => {
    if (mode === 'observe' && isSelfCall(request) && !isSelfCallable(request)) {
      logNonOptedRoute(request, mode, log);
    }

    return responseToolkit.continue;
  };
};
