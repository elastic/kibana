/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Server } from '@hapi/hapi';
import type {
  Lifecycle,
  Request,
  ResponseToolkit,
  RouteOptionsCors,
  ServerOptions,
  Util,
} from '@hapi/hapi';
import Hoek from '@hapi/hoek';
import type { ServerOptions as TLSOptions } from 'https';
import type { ValidationError } from 'joi';
import uuid from 'uuid';
import { ensureNoUnsafeProperties } from '@kbn/std';
import { HttpConfig } from './http_config';

const corsAllowedHeaders = ['Accept', 'Authorization', 'Content-Type', 'If-None-Match', 'kbn-xsrf'];
/**
 * Converts Kibana `HttpConfig` into `ServerOptions` that are accepted by the Hapi server.
 */
export function getServerOptions(config: HttpConfig, { configureTLS = true } = {}) {
  const cors: RouteOptionsCors | false = config.cors.enabled
    ? {
        credentials: config.cors.allowCredentials,
        origin: config.cors.allowOrigin,
        headers: corsAllowedHeaders,
      }
    : false;
  // Note that all connection options configured here should be exactly the same
  // as in the legacy platform server (see `src/legacy/server/http/index`). Any change
  // SHOULD BE applied in both places. The only exception is TLS-specific options,
  // that are configured only here.
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
      },
      validate: {
        failAction: defaultValidationErrorHandler,
        options: {
          abortEarly: false,
        },
        // TODO: This payload validation can be removed once the legacy platform is completely removed.
        // This is a default payload validation which applies to all LP routes which do not specify their own
        // `validate.payload` handler, in order to reduce the likelyhood of prototype pollution vulnerabilities.
        // (All NP routes are already required to specify their own validation in order to access the payload)
        payload: (value) => Promise.resolve(ensureNoUnsafeProperties(value)),
      },
    },
    state: {
      strictHeader: false,
      isHttpOnly: true,
      isSameSite: false, // necessary to allow using Kibana inside an iframe
    },
  };

  if (configureTLS && config.ssl.enabled) {
    const ssl = config.ssl;

    // TODO: Hapi types have a typo in `tls` property type definition: `https.RequestOptions` is used instead of
    // `https.ServerOptions`, and `honorCipherOrder` isn't presented in `https.RequestOptions`.
    const tlsOptions: TLSOptions = {
      ca: ssl.certificateAuthorities,
      cert: ssl.certificate,
      ciphers: config.ssl.cipherSuites.join(':'),
      // We use the server's cipher order rather than the client's to prevent the BEAST attack.
      honorCipherOrder: true,
      key: ssl.key,
      passphrase: ssl.keyPassphrase,
      secureOptions: ssl.getSecureOptions(),
      requestCert: ssl.requestCert,
      rejectUnauthorized: ssl.rejectUnauthorized,
    };

    options.tls = tlsOptions;
  }

  return options;
}

export function getListenerOptions(config: HttpConfig) {
  return {
    keepaliveTimeout: config.keepaliveTimeout,
    socketTimeout: config.socketTimeout,
  };
}

interface ListenerOptions {
  keepaliveTimeout: number;
  socketTimeout: number;
}

export function createServer(serverOptions: ServerOptions, listenerOptions: ListenerOptions) {
  const server = new Server(serverOptions);

  server.listener.keepAliveTimeout = listenerOptions.keepaliveTimeout;
  server.listener.setTimeout(listenerOptions.socketTimeout);
  server.listener.on('timeout', (socket) => {
    socket.destroy();
  });
  server.listener.on('clientError', (err, socket) => {
    if (socket.writable) {
      socket.end(Buffer.from('HTTP/1.1 400 Bad Request\r\n\r\n', 'ascii'));
    } else {
      socket.destroy(err);
    }
  });

  return server;
}

/**
 * Hapi extends the ValidationError interface to add this output key with more data.
 */
export interface HapiValidationError extends ValidationError {
  output: {
    statusCode: number;
    headers: Util.Dictionary<string | string[]>;
    payload: {
      statusCode: number;
      error: string;
      message?: string;
      validation: {
        source: string;
        keys: string[];
      };
    };
  };
}

/**
 * Used to replicate Hapi v16 and below's validation responses. Should be used in the routes.validate.failAction key.
 */
export function defaultValidationErrorHandler(
  request: Request,
  h: ResponseToolkit,
  err?: Error
): Lifecycle.ReturnValue {
  // Newer versions of Joi don't format the key for missing params the same way. This shim
  // provides backwards compatibility. Unfortunately, Joi doesn't export it's own Error class
  // in JS so we have to rely on the `name` key before we can cast it.
  //
  // The Hapi code we're 'overwriting' can be found here:
  //     https://github.com/hapijs/hapi/blob/master/lib/validation.js#L102
  if (err && err.name === 'ValidationError' && err.hasOwnProperty('output')) {
    const validationError: HapiValidationError = err as HapiValidationError;
    const validationKeys: string[] = [];

    validationError.details.forEach((detail) => {
      if (detail.path.length > 0) {
        validationKeys.push(Hoek.escapeHtml(detail.path.join('.')));
      } else {
        // If no path, use the value sigil to signal the entire value had an issue.
        validationKeys.push('value');
      }
    });

    validationError.output.payload.validation.keys = validationKeys;
  }

  throw err;
}

export function getRequestId(request: Request, options: HttpConfig['requestId']): string {
  return options.allowFromAnyIp ||
    // socket may be undefined in integration tests that connect via the http listener directly
    (request.raw.req.socket?.remoteAddress &&
      options.ipAllowlist.includes(request.raw.req.socket.remoteAddress))
    ? request.headers['x-opaque-id'] ?? uuid.v4()
    : uuid.v4();
}
