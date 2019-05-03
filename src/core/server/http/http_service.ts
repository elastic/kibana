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
import { first } from 'rxjs/operators';

import { CoreService } from '../../types';
import { Logger } from '../logging';
import { CoreContext } from '../core_context';
import { HttpConfig } from './http_config';
import { HttpServer, HttpServerSetup } from './http_server';
import { HttpsRedirectServer } from './https_redirect_server';

/** @public */
export type HttpServiceSetup = HttpServerSetup;
/** @public */
export interface HttpServiceStart {
  /** Indicates if http server is listening on a port */
  isListening: () => boolean;
}

/** @internal */
export class HttpService implements CoreService<HttpServiceSetup, HttpServiceStart> {
  private readonly httpServer: HttpServer;
  private readonly httpsRedirectServer: HttpsRedirectServer;
  private readonly config$: Observable<HttpConfig>;
  private configSubscription?: Subscription;

  private readonly log: Logger;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('http');
    this.config$ = this.coreContext.configService.atPath('server', HttpConfig);

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

    return this.httpServer.setup(config);
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

      await this.httpServer.start(config);
    }

    return {
      isListening: () => this.httpServer.isListening(),
    };
  }

  public async stop() {
    if (this.configSubscription === undefined) {
      return;
    }

    this.configSubscription.unsubscribe();
    this.configSubscription = undefined;

    await this.httpServer.stop();
    await this.httpsRedirectServer.stop();
  }
}
