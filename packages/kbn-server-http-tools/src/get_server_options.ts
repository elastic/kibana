/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RouteOptionsCors, ServerOptions } from '@hapi/hapi';
import { defaultValidationErrorHandler } from './default_validation_error_handler';
import { IHttpConfig } from './types';
import { getServerTLSOptions } from './get_tls_options';

const corsAllowedHeaders = ['Accept', 'Authorization', 'Content-Type', 'If-None-Match', 'kbn-xsrf'];

/**
 * Converts Kibana `HttpConfig` into `ServerOptions` that are accepted by the Hapi server.
 */
export function getServerOptions(config: IHttpConfig, { configureTLS = true } = {}) {
  const cors: RouteOptionsCors | false = config.cors.enabled
    ? {
        credentials: config.cors.allowCredentials,
        origin: config.cors.allowOrigin,
        headers: corsAllowedHeaders,
      }
    : false;
  const options: ServerOptions = {
    host: config.host,
    port: config.port,
    routes: {
      cache: {
        privacy: 'private',
        otherwise: 'private, no-cache, no-store, must-revalidate',
      },
      cors,
      payload: {
        maxBytes: config.maxPayload.getValueInBytes(),
        timeout: config.payloadTimeout,
      },
      validate: {
        failAction: defaultValidationErrorHandler,
        options: {
          abortEarly: false,
        },
      },
    },
    state: {
      strictHeader: false,
      isHttpOnly: true,
      isSameSite: false, // necessary to allow using Kibana inside an iframe
    },
  };

  if (configureTLS) {
    options.tls = getServerTLSOptions(config.ssl);
  }

  return options;
}
