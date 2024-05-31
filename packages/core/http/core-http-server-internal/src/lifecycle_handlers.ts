/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  OnPostAuthHandler,
  OnPreResponseHandler,
  OnPreResponseInfo,
  KibanaRequest,
} from '@kbn/core-http-server';
import { isSafeMethod } from '@kbn/core-http-router-server-internal';
import { Logger } from '@kbn/logging';
import { KIBANA_BUILD_NR_HEADER } from '@kbn/core-http-common';
import { HttpConfig } from './http_config';

const VERSION_HEADER = 'kbn-version';
const XSRF_HEADER = 'kbn-xsrf';
const KIBANA_NAME_HEADER = 'kbn-name';

export const createXsrfPostAuthHandler = (config: HttpConfig): OnPostAuthHandler => {
  const { allowlist, disableProtection } = config.xsrf;

  return (request, response, toolkit) => {
    if (
      disableProtection ||
      allowlist.includes(request.route.path) ||
      request.route.options.xsrfRequired === false
    ) {
      return toolkit.next();
    }

    const hasVersionHeader = VERSION_HEADER in request.headers;
    const hasXsrfHeader = XSRF_HEADER in request.headers;

    if (!isSafeMethod(request.route.method) && !hasVersionHeader && !hasXsrfHeader) {
      return response.badRequest({ body: `Request must contain a ${XSRF_HEADER} header.` });
    }

    return toolkit.next();
  };
};

export const createRestrictInternalRoutesPostAuthHandler = (
  config: HttpConfig
): OnPostAuthHandler => {
  const isRestrictionEnabled = config.restrictInternalApis;

  return (request, response, toolkit) => {
    const isInternalRoute = request.route.options.access === 'internal';
    if (isRestrictionEnabled && isInternalRoute && !request.isInternalApiRequest) {
      // throw 400
      return response.badRequest({
        body: `uri [${request.url.pathname}] with method [${request.route.method}] exists but is not available with the current configuration`,
      });
    }
    return toolkit.next();
  };
};

export const createVersionCheckPostAuthHandler = (kibanaVersion: string): OnPostAuthHandler => {
  return (request, response, toolkit) => {
    const requestVersion = request.headers[VERSION_HEADER];
    if (requestVersion && requestVersion !== kibanaVersion) {
      return response.badRequest({
        body: {
          message:
            `Browser client is out of date, please refresh the page ` +
            `("${VERSION_HEADER}" header was "${requestVersion}" but should be "${kibanaVersion}")`,
          attributes: {
            expected: kibanaVersion,
            got: requestVersion,
          },
        },
      });
    }
    return toolkit.next();
  };
};

export const createCustomHeadersPreResponseHandler = (config: HttpConfig): OnPreResponseHandler => {
  const {
    name: serverName,
    securityResponseHeaders,
    customResponseHeaders,
    csp: { header: cspHeader, reportOnlyHeader: cspReportOnlyHeader },
  } = config;

  const additionalHeaders = {
    ...securityResponseHeaders,
    ...customResponseHeaders,
    'Content-Security-Policy': cspHeader,
    'Content-Security-Policy-Report-Only': cspReportOnlyHeader,
    [KIBANA_NAME_HEADER]: serverName,
  };

  return (request, response, toolkit) => {
    return toolkit.next({ headers: { ...additionalHeaders } });
  };
};

const shouldLogBuildNumberMismatch = (
  serverBuild: { number: number; string: string },
  request: KibanaRequest,
  response: OnPreResponseInfo
): { log: true; clientBuild: number } | { log: false } => {
  if (
    response.statusCode >= 400 &&
    request.headers[KIBANA_BUILD_NR_HEADER] !== serverBuild.string
  ) {
    const clientBuildNumber = parseInt(String(request.headers[KIBANA_BUILD_NR_HEADER]), 10);
    if (!isNaN(clientBuildNumber)) {
      return { log: true, clientBuild: clientBuildNumber };
    }
  }
  return { log: false };
};

/**
 * This should remain part of the logger prefix so that we can notify/track
 * when we see this logged for observability purposes.
 */
const BUILD_NUMBER_MISMATCH_LOGGER_NAME = 'kbn-build-number-mismatch';
export const createBuildNrMismatchLoggerPreResponseHandler = (
  serverBuildNumber: number,
  log: Logger
): OnPreResponseHandler => {
  const serverBuild = { number: serverBuildNumber, string: String(serverBuildNumber) };
  log = log.get(BUILD_NUMBER_MISMATCH_LOGGER_NAME);

  return (request, response, toolkit) => {
    const result = shouldLogBuildNumberMismatch(serverBuild, request, response);
    if (result.log === true) {
      const clientCompAdjective = result.clientBuild > serverBuildNumber ? 'newer' : 'older';
      log.warn(
        `Client build (${result.clientBuild}) is ${clientCompAdjective} than this Kibana server build (${serverBuildNumber}). The [${response.statusCode}] error status in req id [${request.id}] may be due to client-server incompatibility!`
      );
    }
    return toolkit.next();
  };
};
