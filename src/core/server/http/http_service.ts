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
import { Server } from 'hapi';

import { LoggerFactory } from '../logging';
import { CoreService } from '../../types';

import { Logger } from '../logging';
import { ContextSetup } from '../context';
import { CoreContext } from '../core_context';
import { PluginOpaqueId } from '../plugins';

import { Router, IRouter } from './router';
import { HttpConfig, HttpConfigType } from './http_config';
import { HttpServer, HttpServerSetup } from './http_server';
import { HttpsRedirectServer } from './https_redirect_server';

import { RequestHandlerContextContainer, RequestHandlerContextProvider } from './types';

import { RequestHandlerContext } from '../../server';

interface SetupDeps {
  context: ContextSetup;
}

/** @public */
export type HttpServiceSetup = Omit<HttpServerSetup, 'registerRouter'> & {
  /**
   * Provides ability to declare a handler function for a particular path and HTTP request method.
   * Each route can have only one handler functions, which is executed when the route is matched.
   * All routes are prefixed with plugin name as a first segment of URL path.
   * @example
   * ```ts
   * const router = createRouter();
   * // handler is called when '${my-plugin-id}/path' resource is requested with `GET` method
   * router.get({ path: '/path', validate: false }, (context, req, res) => res.ok({ content: 'ok' }));
   * ```
   * @public
   */
  createRouter: (path: string, plugin?: PluginOpaqueId) => IRouter;
  /**
   * Register a context provider for a route handler.
   * @example
   * ```ts
   *  // my-plugin.ts
   *  deps.http.registerRouteHandlerContext(
   *    'myApp',
   *    (context, req) => {
   *     async function search (id: string) {
   *       return await context.elasticsearch.adminClient.callAsInternalUser('endpoint', id);
   *     }
   *     return { search };
   *    }
   *  );
   *
   * // my-route-handler.ts
   *  router.get({ path: '/', validate: false }, async (context, req, res) => {
   *    const response = await context.myApp.search(...);
   *    return res.ok(response);
   *  });
   * ```
   * @public
   */
  registerRouteHandlerContext: <T extends keyof RequestHandlerContext>(
    pluginOpaqueId: PluginOpaqueId,
    contextName: T,
    provider: RequestHandlerContextProvider<RequestHandlerContext>
  ) => RequestHandlerContextContainer<RequestHandlerContext>;
};

/** @public */
export interface HttpServiceStart {
  /** Indicates if http server is listening on a given port */
  isListening: (port: number) => boolean;
}

/** @internal */
export class HttpService implements CoreService<HttpServiceSetup, HttpServiceStart> {
  private readonly httpServer: HttpServer;
  private readonly httpsRedirectServer: HttpsRedirectServer;
  private readonly config$: Observable<HttpConfig>;
  private configSubscription?: Subscription;

  private readonly logger: LoggerFactory;
  private readonly log: Logger;
  private notReadyServer?: Server;
  private requestHandlerContext?: RequestHandlerContextContainer<RequestHandlerContext>;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger;
    this.log = coreContext.logger.get('http');
    this.config$ = coreContext.configService
      .atPath<HttpConfigType>('server')
      .pipe(map(rawConfig => new HttpConfig(rawConfig, coreContext.env)));

    this.httpServer = new HttpServer(coreContext.logger, 'Kibana');
    this.httpsRedirectServer = new HttpsRedirectServer(
      coreContext.logger.get('http', 'redirect', 'server')
    );
  }

  public async setup(deps: SetupDeps) {
    this.requestHandlerContext = deps.context.createContextContainer();
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

    if (this.shouldListen(config)) {
      await this.runNotReadyServer(config);
    }

    const { registerRouter, ...serverContract } = await this.httpServer.setup(config);
    const contract: HttpServiceSetup = {
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
        provider: RequestHandlerContextProvider<RequestHandlerContext>
      ) => this.requestHandlerContext!.registerContext(pluginOpaqueId, contextName, provider),
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
