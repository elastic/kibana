/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FastifyInstance } from 'fastify';
import { format as formatUrl } from 'url';
import {
  createServer,
  getServerOptions,
  getCorsOptions,
  getListenerOptions,
} from '@kbn/server-http-tools';
import type { Logger } from '@kbn/logging';

import { HttpConfig } from './http_config';

export class HttpsRedirectServer {
  private server?: FastifyInstance;

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
      getServerOptions(config, { configureTLS: false }),
      getCorsOptions(config)
    );

    this.server.addHook('onRequest', (request, reply) => {
      return reply
        .redirect(
          formatUrl({
            hostname: config.host,
            pathname: request.url,
            port: config.port,
            protocol: 'https',
            search: new URLSearchParams(request.query as any).toString(),
          })
        )
        .hijack();
    });

    try {
      await this.server.listen({
        ...getListenerOptions(config),
        port: config.ssl.redirectHttpFromPort,
      });
      this.log.debug(`http --> https redirect server running at ${'TODO'}`); // TODO: Convert this TODO from hapi to Fastify: `this.server.info.uri`
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
    await this.server.close();
    this.server = undefined;
  }
}
