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

import { Observable, Subscription, combineLatest } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { Server } from 'hapi';

import { CoreService } from '../../types';
import { Logger, LoggerFactory } from '../logging';
import { ContextSetup } from '../context';
import { Env } from '../config';
import { CoreContext } from '../core_context';
import { PluginOpaqueId } from '../plugins';
import { CspConfigType, config as cspConfig } from '../csp';

import { Router } from './router';
import { HttpConfig, HttpConfigType, config as httpConfig } from './http_config';
import { HttpServer } from './http_server';
import { HttpsRedirectServer } from './https_redirect_server';

import {
  RequestHandlerContextContainer,
  RequestHandlerContextProvider,
  InternalHttpServiceSetup,
  HttpServiceStart,
} from './types';

import { RequestHandlerContext } from '../../server';
import { registerCoreHandlers } from './lifecycle_handlers';

interface SetupDeps {
  context: ContextSetup;
}

/** @internal */
export class HttpService implements CoreService<InternalHttpServiceSetup, HttpServiceStart> {
  private readonly httpServer: HttpServer;
  private readonly httpsRedirectServer: HttpsRedirectServer;
  private readonly config$: Observable<HttpConfig>;
  private configSubscription?: Subscription;

  private readonly logger: LoggerFactory;
  private readonly log: Logger;
  private readonly env: Env;
  private notReadyServer?: Server;
  private requestHandlerContext?: RequestHandlerContextContainer;

  constructor(private readonly coreContext: CoreContext) {
    const { logger, configService, env } = coreContext;

    this.logger = logger;
    this.env = env;
    this.log = logger.get('http');
    this.config$ = combineLatest([
      configService.atPath<HttpConfigType>(httpConfig.path),
      configService.atPath<CspConfigType>(cspConfig.path),
    ]).pipe(map(([http, csp]) => new HttpConfig(http, csp)));
    this.httpServer = new HttpServer(logger, 'Kibana');
    this.httpsRedirectServer = new HttpsRedirectServer(logger.get('http', 'redirect', 'server'));
  }

  public async setup(deps: SetupDeps) {
    this.requestHandlerContext = deps.context.createContextContainer();
    this.configSubscription = this.config$.subscribe(() => {
      if (this.httpServer.isListening()) {
        // If the server is already running we can't make any config changes
        // to it, so we warn and don't allow the config to pass through.
        this.log.warn(
          'Received new HTTP config after server was started. Config will **not** be applied.'
        );
      }
    });

    const config = await this.config$.pipe(first()).toPromise();

    if (this.shouldListen(config)) {
      await this.runNotReadyServer(config);
    }

    const { registerRouter, ...serverContract } = await this.httpServer.setup(config);

    registerCoreHandlers(serverContract, config, this.env);

    const contract: InternalHttpServiceSetup = {
      ...serverContract,

      createRouter: (path: string, pluginId: PluginOpaqueId = this.coreContext.coreId) => {
        const enhanceHandler = this.requestHandlerContext!.createHandler.bind(null, pluginId);
        const router = new Router(path, this.log, enhanceHandler);
        registerRouter(router);
        return router;
      },

      registerRouteHandlerContext: <T extends keyof RequestHandlerContext>(
        pluginOpaqueId: PluginOpaqueId,
        contextName: T,
        provider: RequestHandlerContextProvider<T>
      ) => this.requestHandlerContext!.registerContext(pluginOpaqueId, contextName, provider),

      config: {
        defaultRoute: config.defaultRoute,
      },
    };

    return contract;
  }

  public async start() {
    const config = await this.config$.pipe(first()).toPromise();
    if (this.shouldListen(config)) {
      if (this.notReadyServer) {
        this.log.debug('stopping NotReady server');
        await this.notReadyServer.stop();
        this.notReadyServer = undefined;
      }
      // If a redirect port is specified, we start an HTTP server at this port and
      // redirect all requests to the SSL port.
      if (config.ssl.enabled && config.ssl.redirectHttpFromPort !== undefined) {
        await this.httpsRedirectServer.start(config);
      }

      await this.httpServer.start();
    }

    return {
      isListening: () => this.httpServer.isListening(),
    };
  }

  /**
   * Indicates if http server has configured to start listening on a configured port.
   * We shouldn't start http service in two cases:
   * 1. If `server.autoListen` is explicitly set to `false`.
   * 2. When the process is run as dev cluster master in which case cluster manager
   * will fork a dedicated process where http service will be set up instead.
   * @internal
   * */
  private shouldListen(config: HttpConfig) {
    return !this.coreContext.env.isDevClusterMaster && config.autoListen;
  }

  public async stop() {
    if (this.configSubscription === undefined) {
      return;
    }

    this.configSubscription.unsubscribe();
    this.configSubscription = undefined;

    if (this.notReadyServer) {
      await this.notReadyServer.stop();
    }
    await this.httpServer.stop();
    await this.httpsRedirectServer.stop();
  }

  private async runNotReadyServer(config: HttpConfig) {
    this.log.debug('starting NotReady server');
    const httpServer = new HttpServer(this.logger, 'NotReady');
    const { server } = await httpServer.setup(config);
    this.notReadyServer = server;
    // use hapi server while KibanaResponseFactory doesn't allow specifying custom headers
    // https://github.com/elastic/kibana/issues/33779
    this.notReadyServer.route({
      path: '/{p*}',
      method: '*',
      handler: (req, responseToolkit) => {
        this.log.debug(`Kibana server is not ready yet ${req.method}:${req.url.href}.`);

        // If server is not ready yet, because plugins or core can perform
        // long running tasks (build assets, saved objects migrations etc.)
        // we should let client know that and ask to retry after 30 seconds.
        return responseToolkit
          .response('Kibana server is not ready yet')
          .code(503)
          .header('Retry-After', '30');
      },
    });
    await this.notReadyServer.start();
  }
}
