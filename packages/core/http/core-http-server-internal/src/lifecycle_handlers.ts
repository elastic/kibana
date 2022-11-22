/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Env } from '@kbn/config';
import type { OnPostAuthHandler, OnPreResponseHandler } from '@kbn/core-http-server';
import { isSafeMethod } from '@kbn/core-http-router-server-internal';
import { HttpConfig } from './http_config';
import { LifecycleRegistrar } from './http_server';

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
    csp: { header: cspHeader },
  } = config;

  return (request, response, toolkit) => {
    const additionalHeaders = {
      ...securityResponseHeaders,
      ...customResponseHeaders,
      'Content-Security-Policy': cspHeader,
      [KIBANA_NAME_HEADER]: serverName,
    };

    return toolkit.next({ headers: additionalHeaders });
  };
};

export const registerCoreHandlers = (
  registrar: LifecycleRegistrar,
  config: HttpConfig,
  env: Env
) => {
  registrar.registerOnPreResponse(createCustomHeadersPreResponseHandler(config));
  registrar.registerOnPostAuth(createXsrfPostAuthHandler(config));
  registrar.registerOnPostAuth(createVersionCheckPostAuthHandler(env.packageInfo.version));
};
