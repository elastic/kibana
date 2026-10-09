/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isBoom } from '@hapi/boom';
import type { Lifecycle, Request, ResponseToolkit } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

export const SELF_CALL_HEADER = 'x-kbn-self-call';
export const SELF_CALL_OBSERVED_EVENT_ACTION = 'kibana_self_http_request';

interface SelfCallObservation {
  readonly method: string;
  readonly routeTemplate: string;
  readonly apiVersion?: string;
}

const SELF_CALL_OBSERVATION = Symbol('selfCallObservation');
type RequestWithObservation = Request & {
  app: Request['app'] & { [SELF_CALL_OBSERVATION]?: SelfCallObservation };
};

const getSafeApiVersion = (request: Request): string | undefined => {
  const apiVersion = request.headers[ELASTIC_HTTP_VERSION_HEADER];
  const version = Array.isArray(apiVersion) ? apiVersion[0] : apiVersion;
  return typeof version === 'string' &&
    (/^\d{4}-\d{2}-\d{2}$/.test(version) || /^\d{1,4}(?:\.\d{1,4}){0,2}$/.test(version))
    ? version
    : undefined;
};

export const createSelfCallPreHandler = (): Lifecycle.Method => {
  return (request: Request, responseToolkit: ResponseToolkit) => {
    if (request.headers[SELF_CALL_HEADER] === undefined) {
      return responseToolkit.continue;
    }

    const requestWithObservation = request as RequestWithObservation;
    requestWithObservation.app[SELF_CALL_OBSERVATION] = {
      method: request.method.toUpperCase(),
      routeTemplate: request.route.path,
      apiVersion: getSafeApiVersion(request),
    };

    return responseToolkit.continue;
  };
};

export const createSelfCallPreResponseHandler = (log: Logger): Lifecycle.Method => {
  return (request: Request, responseToolkit: ResponseToolkit) => {
    const requestWithObservation = request as RequestWithObservation;
    const observation = requestWithObservation.app[SELF_CALL_OBSERVATION];
    if (!observation || !request.response) {
      return responseToolkit.continue;
    }

    delete requestWithObservation.app[SELF_CALL_OBSERVATION];
    const statusCode = isBoom(request.response)
      ? request.response.output.statusCode
      : request.response.statusCode;

    log.info('Kibana self HTTP call completed', {
      event: { action: SELF_CALL_OBSERVED_EVENT_ACTION },
      http: {
        request: { method: observation.method },
        response: { status_code: statusCode },
      },
      labels: {
        self_http_route_template: observation.routeTemplate,
        self_http_status_class: `${Math.floor(statusCode / 100)}xx`,
        ...(observation.apiVersion ? { self_http_api_version: observation.apiVersion } : {}),
      },
    });

    return responseToolkit.continue;
  };
};
