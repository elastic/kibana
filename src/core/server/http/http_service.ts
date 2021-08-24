/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Env } from '@kbn/config';
import type { Logger } from '@kbn/logging';
import { pick } from '@kbn/std';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { first, map } from 'rxjs/operators';
import type { RequestHandlerContext } from '..';
import type { CoreService } from '../../types/core_service';
import type { ContextSetup, InternalContextPreboot } from '../context/context_service';
import type { CoreContext } from '../core_context';
import type { CspConfigType } from '../csp/config';
import { config as cspConfig } from '../csp/config';
import type { InternalExecutionContextSetup } from '../execution_context/execution_context_service';
import type { ExternalUrlConfigType } from '../external_url/config';
import { config as externalUrlConfig } from '../external_url/config';
import { ExternalUrlConfig } from '../external_url/external_url_config';
import type { PluginOpaqueId } from '../plugins/types';
import { HttpsRedirectServer } from './https_redirect_server';
import type { HttpConfigType } from './http_config';
import { config as httpConfig, HttpConfig } from './http_config';
import { HttpServer } from './http_server';
import { registerCoreHandlers } from './lifecycle_handlers';
import { Router } from './router/router';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
  InternalHttpServiceStart,
  RequestHandlerContextContainer,
  RequestHandlerContextProvider,
} from './types';

interface PrebootDeps {
  context: InternalContextPreboot;
}

interface SetupDeps {
  context: ContextSetup;
  executionContext: InternalExecutionContextSetup;
}

/** @internal */
export class HttpService
  implements CoreService<InternalHttpServiceSetup, InternalHttpServiceStart> {
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
  private requestHandlerContext?: RequestHandlerContextContainer;

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
    const config = await this.config$.pipe(first()).toPromise();

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
      registerRoutes: (path, registerCallback) => {
        const router = new Router(
          path,
          this.log,
          prebootServerRequestHandlerContext.createHandler.bind(null, this.coreContext.coreId)
        );

        registerCallback(router);

        prebootSetup.registerRouterAfterListening(router);
      },
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

    const config = await this.config$.pipe(first()).toPromise();

    const { registerRouter, ...serverContract } = await this.httpServer.setup(
      config,
      deps.executionContext
    );

    registerCoreHandlers(serverContract, config, this.env);

    this.internalSetup = {
      ...serverContract,

      externalUrl: new ExternalUrlConfig(config.externalUrl),

      createRouter: <Context extends RequestHandlerContext = RequestHandlerContext>(
        path: string,
        pluginId: PluginOpaqueId = this.coreContext.coreId
      ) => {
        const enhanceHandler = this.requestHandlerContext!.createHandler.bind(null, pluginId);
        const router = new Router<Context>(path, this.log, enhanceHandler);
        registerRouter(router);
        return router;
      },

      registerRouteHandlerContext: <
        Context extends RequestHandlerContext,
        ContextName extends keyof Context
      >(
        pluginOpaqueId: PluginOpaqueId,
        contextName: ContextName,
        provider: RequestHandlerContextProvider<Context, ContextName>
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
    const config = await this.config$.pipe(first()).toPromise();
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
