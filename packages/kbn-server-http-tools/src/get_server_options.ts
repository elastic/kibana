/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FastifyServerOptions } from 'fastify';
import { ServerOptions as TLSOptions } from 'https';
// import { defaultValidationErrorHandler } from './default_validation_error_handler';
import { IHttpConfig } from './types';

/**
 * Converts Kibana `HttpConfig` into `FastifyServerOptions` that are accepted by the Fastify server.
 */
export function getServerOptions(config: IHttpConfig, { configureTLS = true } = {}) {
  const options: FastifyServerOptions = {
    keepAliveTimeout: config.keepaliveTimeout,
    connectionTimeout: config.socketTimeout,
    // routes: {
    //   cache: {
    //     privacy: 'private',
    //     otherwise: 'private, no-cache, no-store, must-revalidate',
    //   },
    //   payload: {
    //     maxBytes: config.maxPayload.getValueInBytes(),
    //   },
    //   validate: {
    //     failAction: defaultValidationErrorHandler,
    //     options: {
    //       abortEarly: false,
    //     },
    //   },
    // },
    // state: {
    //   strictHeader: false,
    //   isHttpOnly: true,
    //   isSameSite: false, // necessary to allow using Kibana inside an iframe
    // },
  };

  if (configureTLS && config.ssl.enabled) {
    const ssl = config.ssl;

    const tlsOptions: TLSOptions = {
      ca: ssl.certificateAuthorities,
      cert: ssl.certificate,
      ciphers: config.ssl.cipherSuites?.join(':'),
      // We use the server's cipher order rather than the client's to prevent the BEAST attack.
      honorCipherOrder: true,
      key: ssl.key,
      passphrase: ssl.keyPassphrase,
      secureOptions: ssl.getSecureOptions ? ssl.getSecureOptions() : undefined,
      requestCert: ssl.requestCert,
      rejectUnauthorized: ssl.rejectUnauthorized,
    };

    // @ts-expect-error: The property `https` isn't defined on Fastify FastifyServerOptions type, but is the official way to specify tls options
    options.https = tlsOptions;
  }

  return options;
}
