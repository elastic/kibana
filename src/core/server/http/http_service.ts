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

import { Observable, Subscription } from 'rxjs';
import { first, map } from 'rxjs/operators';

import { LoggerFactory } from '../logging';
import { CoreService } from '../../types';
import { Logger } from '../logging';
import { CoreContext } from '../core_context';
import { HttpConfig, HttpConfigType, config as httpConfig } from './http_config';
import { HttpServer, HttpServerSetup } from './http_server';
import { HttpsRedirectServer } from './https_redirect_server';

/** @public */
export interface HttpServiceSetup extends HttpServerSetup {
  createNewServer: (cfg: Partial<HttpConfig>) => Promise<HttpServerSetup>;
}
/** @public */
export interface HttpServiceStart {
  /** Indicates if http server is listening on a port */
  isListening: () => boolean;
}

/** @internal */
export class HttpService implements CoreService<HttpServiceSetup, HttpServiceStart> {
  private readonly httpServer: HttpServer;
  private readonly secondaryServers: Map<number, HttpServer> = new Map();
  private readonly httpsRedirectServer: HttpsRedirectServer;
  private readonly config$: Observable<HttpConfig>;
  private configSubscription?: Subscription;

  private readonly logger: LoggerFactory;
  private readonly log: Logger;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger;
    this.log = coreContext.logger.get('http');
    this.config$ = coreContext.configService
      .atPath<HttpConfigType>('server')
      .pipe(map(rawConfig => new HttpConfig(rawConfig, coreContext.env)));

    this.httpServer = new HttpServer(coreContext.logger.get('http', 'server'));
    this.httpsRedirectServer = new HttpsRedirectServer(
      coreContext.logger.get('http', 'redirect', 'server')
    );
  }

  public async setup() {
    this.configSubscription = this.config$.subscribe(() => {
      if (this.httpServer.isListening()) {
        // If the server is already running we can't make any config changes
        // to it, so we warn and don't allow the config to pass through.
        this.log.warn(
          'Received new HTTP config after server was started. ' + 'Config will **not** be applied.'
        );
      }
    });

    const config = await this.config$.pipe(first()).toPromise();

    const httpSetup = (this.httpServer.setup(config) || {}) as HttpServiceSetup;
    const setup = {
      ...httpSetup,
      ...{ createNewServer: this.createServer.bind(this) },
    };
    return setup;
  }

  public async start() {
    const config = await this.config$.pipe(first()).toPromise();

    // We shouldn't set up http service in two cases:`
    // 1. If `server.autoListen` is explicitly set to `false`.
    // 2. When the process is run as dev cluster master in which case cluster manager
    // will fork a dedicated process where http service will be set up instead.
    if (!this.coreContext.env.isDevClusterMaster && config.autoListen) {
      // If a redirect port is specified, we start an HTTP server at this port and
      // redirect all requests to the SSL port.
      if (config.ssl.enabled && config.ssl.redirectHttpFromPort !== undefined) {
        await this.httpsRedirectServer.start(config);
      }

      await this.httpServer.start();
      await Promise.all([...this.secondaryServers.values()].map(server => server.start()));
    }

    return {
      isListening: (port = 0) => {
        const server = this.secondaryServers.get(port);
        if (server) return server.isListening();
        return this.httpServer.isListening();
      },
    };
  }

  private async createServer(cfg: Partial<HttpConfig>) {
    const { port } = cfg;
    const config = await this.config$.pipe(first()).toPromise();

    if (!port) {
      throw new Error('port must be defined');
    }

    // verify that main server and none of the secondary servers are already using this port
    if (this.secondaryServers.has(port) || config.port === port) {
      throw new Error(`port ${port} is already in use`);
    }

    for (const [key, val] of Object.entries(cfg)) {
      httpConfig.schema.validateKey(key, val);
    }

    const baseConfig = await this.config$.pipe(first()).toPromise();
    const finalConfig = { ...baseConfig, ...cfg };
    const log = this.logger.get('http', `server:${port}`);

    const httpServer = new HttpServer(log);
    const httpSetup = await httpServer.setup(finalConfig);
    this.secondaryServers.set(port, httpServer);
    return httpSetup;
  }

  public async stop() {
    if (this.configSubscription === undefined) {
      return;
    }

    this.configSubscription.unsubscribe();
    this.configSubscription = undefined;

    await this.httpServer.stop();
    await this.httpsRedirectServer.stop();
    await Promise.all([...this.secondaryServers.values()].map(s => s.stop()));
    this.secondaryServers.clear();
  }
}
