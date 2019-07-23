/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { readFileSync } from 'fs';
import { Lifecycle, Request, ResponseToolkit, Server, ServerOptions, Util } from 'hapi';
import Hoek from 'hoek';
import { ServerOptions as TLSOptions } from 'https';
import { ValidationError } from 'joi';
import { HttpConfig } from './http_config';

/**
 * Converts Kibana `HttpConfig` into `ServerOptions` that are accepted by the Hapi server.
 */
export function getServerOptions(config: HttpConfig, { configureTLS = true } = {}) {
  // Note that all connection options configured here should be exactly the same
  // as in the legacy platform server (see `src/legacy/server/http/index`). Any change
  // SHOULD BE applied in both places. The only exception is TLS-specific options,
  // that are configured only here.
  const options: ServerOptions = {
    host: config.host,
    port: config.port,
    routes: {
      cors: config.cors,
      payload: {
        maxBytes: config.maxPayload.getValueInBytes(),
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

  if (configureTLS && config.ssl.enabled) {
    const ssl = config.ssl;

    // TODO: Hapi types have a typo in `tls` property type definition: `https.RequestOptions` is used instead of
    // `https.ServerOptions`, and `honorCipherOrder` isn't presented in `https.RequestOptions`.
    const tlsOptions: TLSOptions = {
      ca:
        config.ssl.certificateAuthorities &&
        config.ssl.certificateAuthorities.map(caFilePath => readFileSync(caFilePath)),
      cert: readFileSync(ssl.certificate!),
      ciphers: config.ssl.cipherSuites.join(':'),
      // We use the server's cipher order rather than the client's to prevent the BEAST attack.
      honorCipherOrder: true,
      key: readFileSync(ssl.key!),
      passphrase: ssl.keyPassphrase,
      secureOptions: ssl.getSecureOptions(),
      requestCert: ssl.requestCert,
    };

    options.tls = tlsOptions;
  }

  return options;
}

export function createServer(options: ServerOptions) {
  const server = new Server(options);

  // Revert to previous 120 seconds keep-alive timeout in Node < 8.
  server.listener.keepAliveTimeout = 120e3;
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

    validationError.details.forEach(detail => {
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
