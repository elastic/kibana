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

import { Request, ResponseToolkit, Server } from 'hapi';
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
