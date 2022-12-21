/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, Subscription, combineLatest, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { pick } from '@kbn/std';

import { Logger } from '@kbn/logging';
import { Env } from '@kbn/config';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import type {
  RequestHandlerContextBase,
  IRouter,
  IContextContainer,
  IContextProvider,
} from '@kbn/core-http-server';
import type {
  InternalContextSetup,
  InternalContextPreboot,
} from '@kbn/core-http-context-server-internal';
import { Router } from '@kbn/core-http-router-server-internal';

import { CspConfigType, cspConfig } from './csp';
import { HttpConfig, HttpConfigType, config as httpConfig } from './http_config';
import { HttpServer } from './http_server';
import { HttpsRedirectServer } from './https_redirect_server';
import {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
  InternalHttpServiceStart,
} from './types';
import { registerCoreHandlers } from './lifecycle_handlers';
import { ExternalUrlConfigType, externalUrlConfig, ExternalUrlConfig } from './external_url';

export interface PrebootDeps {
  context: InternalContextPreboot;
}

export interface SetupDeps {
  context: InternalContextSetup;
  executionContext: InternalExecutionContextSetup;
}

/** @internal */
export class HttpService
  implements CoreService<InternalHttpServiceSetup, InternalHttpServiceStart>
{
  private readonly prebootServer: HttpServer;
  private isPrebootServerStopped = false;
  private readonly httpServer: HttpServer;
  private readonly httpsRedirectServer: HttpsRedirectServer;
  private readonly config$: Observable<HttpConfig>;
  private configSubscription?: Subscription;

  private readonly log: Logger;
  private readonly env: Env;
  private internalPreboot?: InternalHttpServicePreboot;
  private internalSetup?: InternalHttpServiceSetup;
  private requestHandlerContext?: IContextContainer;

  constructor(private readonly coreContext: CoreContext) {
    const { logger, configService, env } = coreContext;

    this.env = env;
    this.log = logger.get('http');
    this.config$ = combineLatest([
      configService.atPath<HttpConfigType>(httpConfig.path),
      configService.atPath<CspConfigType>(cspConfig.path),
      configService.atPath<ExternalUrlConfigType>(externalUrlConfig.path),
    ]).pipe(map(([http, csp, externalUrl]) => new HttpConfig(http, csp, externalUrl)));
    const shutdownTimeout$ = this.config$.pipe(map(({ shutdownTimeout }) => shutdownTimeout));
    this.prebootServer = new HttpServer(logger, 'Preboot', shutdownTimeout$);
    this.httpServer = new HttpServer(logger, 'Kibana', shutdownTimeout$);
    this.httpsRedirectServer = new HttpsRedirectServer(logger.get('http', 'redirect', 'server'));
  }

  public async preboot(deps: PrebootDeps): Promise<InternalHttpServicePreboot> {
    this.log.debug('setting up preboot server');
    const config = await firstValueFrom(this.config$);

    const prebootSetup = await this.prebootServer.setup(config);
    prebootSetup.server.route({
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

    registerCoreHandlers(prebootSetup, config, this.env);

    if (this.shouldListen(config)) {
      this.log.debug('starting preboot server');
      await this.prebootServer.start();
    }

    const prebootServerRequestHandlerContext = deps.context.createContextContainer();
    this.internalPreboot = {
      externalUrl: new ExternalUrlConfig(config.externalUrl),
      csp: prebootSetup.csp,
      basePath: prebootSetup.basePath,
      registerStaticDir: prebootSetup.registerStaticDir.bind(prebootSetup),
      auth: prebootSetup.auth,
      server: prebootSetup.server,
      registerRouteHandlerContext: (pluginOpaqueId, contextName, provider) =>
        prebootServerRequestHandlerContext.registerContext(pluginOpaqueId, contextName, provider),
      registerRoutes: <
        DefaultRequestHandlerType extends RequestHandlerContextBase = RequestHandlerContextBase
      >(
        path: string,
        registerCallback: (router: IRouter<DefaultRequestHandlerType>) => void
      ) => {
        const router = new Router<DefaultRequestHandlerType>(
          path,
          this.log,
          prebootServerRequestHandlerContext.createHandler.bind(null, this.coreContext.coreId)
        );

        registerCallback(router);

        prebootSetup.registerRouterAfterListening(router);
      },
      getServerInfo: prebootSetup.getServerInfo,
    };

    return this.internalPreboot;
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

    const config = await firstValueFrom(this.config$);

    const { registerRouter, ...serverContract } = await this.httpServer.setup(
      config,
      deps.executionContext
    );

    registerCoreHandlers(serverContract, config, this.env);

    this.internalSetup = {
      ...serverContract,

      externalUrl: new ExternalUrlConfig(config.externalUrl),

      createRouter: <Context extends RequestHandlerContextBase = RequestHandlerContextBase>(
        path: string,
        pluginId: PluginOpaqueId = this.coreContext.coreId
      ) => {
        const enhanceHandler = this.requestHandlerContext!.createHandler.bind(null, pluginId);
        const router = new Router<Context>(path, this.log, enhanceHandler);
        registerRouter(router);
        return router;
      },

      registerRouteHandlerContext: <
        Context extends RequestHandlerContextBase,
        ContextName extends keyof Context
      >(
        pluginOpaqueId: PluginOpaqueId,
        contextName: ContextName,
        provider: IContextProvider<Context, ContextName>
      ) => this.requestHandlerContext!.registerContext(pluginOpaqueId, contextName, provider),

      registerPrebootRoutes: this.internalPreboot!.registerRoutes,
    };

    return this.internalSetup;
  }

  // this method exists because we need the start contract to create the `CoreStart` used to start
  // the `plugin` and `legacy` services.
  public getStartContract(): InternalHttpServiceStart {
    return {
      ...pick(this.internalSetup!, ['auth', 'basePath', 'getServerInfo']),
      isListening: () => this.httpServer.isListening(),
    };
  }

  public async start() {
    const config = await firstValueFrom(this.config$);
    if (this.shouldListen(config)) {
      this.log.debug('stopping preboot server');
      await this.prebootServer.stop();
      this.isPrebootServerStopped = true;

      // If a redirect port is specified, we start an HTTP server at this port and
      // redirect all requests to the SSL port.
      if (config.ssl.enabled && config.ssl.redirectHttpFromPort !== undefined) {
        await this.httpsRedirectServer.start(config);
      }

      await this.httpServer.start();
    }

    return this.getStartContract();
  }

  /**
   * Indicates if http server is configured to start listening on a configured port.
   * (if `server.autoListen` is not explicitly set to `false`.)
   *
   * @internal
   * */
  private shouldListen(config: HttpConfig) {
    return config.autoListen;
  }

  public async stop() {
    this.configSubscription?.unsubscribe();
    this.configSubscription = undefined;

    if (!this.isPrebootServerStopped) {
      this.isPrebootServerStopped = false;
      await this.prebootServer.stop();
    }

    await this.httpServer.stop();
    await this.httpsRedirectServer.stop();
  }
}
