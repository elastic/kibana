/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Request, ResponseToolkit, Server } from '@hapi/hapi';
import { format as formatUrl } from 'url';

import { Logger } from '../logging';
import { HttpConfig } from './http_config';
import { createServer, getListenerOptions, getServerOptions } from './http_tools';

export class HttpsRedirectServer {
  private server?: Server;

  constructor(private readonly log: Logger) {}

  public async start(config: HttpConfig) {
    this.log.debug('starting http --> https redirect server');

    if (!config.ssl.enabled || config.ssl.redirectHttpFromPort === undefined) {
      throw new Error(
        'Redirect server cannot be started when [ssl.enabled] is set to `false`' +
          ' or [ssl.redirectHttpFromPort] is not specified.'
      );
    }

    // Redirect server is configured in the same way as any other HTTP server
    // within the platform with the only exception that it should always be a
    // plain HTTP server, so we just ignore `tls` part of options.
    this.server = createServer(
      {
        ...getServerOptions(config, { configureTLS: false }),
        port: config.ssl.redirectHttpFromPort,
      },
      getListenerOptions(config)
    );

    this.server.ext('onRequest', (request: Request, responseToolkit: ResponseToolkit) => {
      return responseToolkit
        .redirect(
          formatUrl({
            hostname: config.host,
            pathname: request.url.pathname,
            port: config.port,
            protocol: 'https',
            search: request.url.search,
          })
        )
        .takeover();
    });

    try {
      await this.server.start();
      this.log.debug(`http --> https redirect server running at ${this.server.info.uri}`);
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        throw new Error(
          'The redirect server failed to start up because port ' +
            `${config.ssl.redirectHttpFromPort} is already in use. Ensure the port specified ` +
            'in `server.ssl.redirectHttpFromPort` is available.'
        );
      } else {
        throw err;
      }
    }
  }

  public async stop() {
    if (this.server === undefined) {
      return;
    }

    this.log.debug('stopping http --> https redirect server');
    await this.server.stop();
    this.server = undefined;
  }
}
