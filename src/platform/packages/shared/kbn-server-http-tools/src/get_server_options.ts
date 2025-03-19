/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteOptionsCors, ServerOptions } from '@hapi/hapi';
import type { IHttpConfig } from './types';
import { defaultValidationErrorHandler } from './default_validation_error_handler';
import { getServerListener } from './get_listener';

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
    // manually configuring the listener
    // @ts-expect-error HAPI types only define http1/https listener, not http2
    listener: getServerListener(config, { configureTLS }),
    // must set to true when manually passing a TLS listener, false otherwise
    tls: configureTLS && config.ssl.enabled,
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

  return options;
}
