/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, Subscription, combineLatest, of } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { pick } from '@kbn/std';

import type { RequestHandlerContext } from 'src/core/server';
import { CoreService } from '../../types';
import { Logger, LoggerFactory } from '../logging';
import { ContextSetup } from '../context';
import { Env } from '../config';
import { CoreContext } from '../core_context';
import { PluginOpaqueId } from '../plugins';
import { CspConfigType, config as cspConfig } from '../csp';

import { IRouter, Router } from './router';
import { HttpConfig, HttpConfigType, config as httpConfig } from './http_config';
import { HttpServer } from './http_server';
import { HttpsRedirectServer } from './https_redirect_server';

import {
  RequestHandlerContextContainer,
  RequestHandlerContextProvider,
  InternalHttpServiceSetup,
  InternalHttpServiceStart,
  InternalNotReadyHttpServiceSetup,
} from './types';

import { registerCoreHandlers } from './lifecycle_handlers';
import {
  ExternalUrlConfigType,
  config as externalUrlConfig,
  ExternalUrlConfig,
} from '../external_url';

interface SetupDeps {
  context: ContextSetup;
}

/** @internal */
export class HttpService
  implements CoreService<InternalHttpServiceSetup, InternalHttpServiceStart> {
  private readonly httpServer: HttpServer;
  private readonly httpsRedirectServer: HttpsRedirectServer;
  private readonly config$: Observable<HttpConfig>;
  private configSubscription?: Subscription;

  private readonly logger: LoggerFactory;
  private readonly log: Logger;
  private readonly env: Env;
  private notReadyServer?: HttpServer;
  private internalSetup?: InternalHttpServiceSetup;
  private requestHandlerContext?: RequestHandlerContextContainer;

  constructor(private readonly coreContext: CoreContext) {
    const { logger, configService, env } = coreContext;

    this.logger = logger;
    this.env = env;
    this.log = logger.get('http');
    this.config$ = combineLatest([
      configService.atPath<HttpConfigType>(httpConfig.path),
      configService.atPath<CspConfigType>(cspConfig.path),
      configService.atPath<ExternalUrlConfigType>(externalUrlConfig.path),
    ]).pipe(map(([http, csp, externalUrl]) => new HttpConfig(http, csp, externalUrl)));
    const shutdownTimeout$ = this.config$.pipe(map(({ shutdownTimeout }) => shutdownTimeout));
    this.httpServer = new HttpServer(logger, 'Kibana', shutdownTimeout$);
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

    const notReadyServer = await this.setupNotReadyService({ config, context: deps.context });

    const { registerRouter, ...serverContract } = await this.httpServer.setup(config);

    registerCoreHandlers(serverContract, config, this.env);

    this.internalSetup = {
      ...serverContract,

      notReadyServer,

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
    if (this.configSubscription === undefined) {
      return;
    }

    this.configSubscription?.unsubscribe();
    this.configSubscription = undefined;

    if (this.notReadyServer) {
      await this.notReadyServer.stop();
    }
    await this.httpServer.stop();
    await this.httpsRedirectServer.stop();
  }

  private async setupNotReadyService({
    config,
    context,
  }: {
    config: HttpConfig;
    context: ContextSetup;
  }): Promise<InternalNotReadyHttpServiceSetup | undefined> {
    if (!this.shouldListen(config)) {
      return;
    }

    const notReadySetup = await this.runNotReadyServer(config);

    // We cannot use the real context container since the core services may not yet be ready
    const fakeContext: RequestHandlerContextContainer = new Proxy(
      context.createContextContainer(),
      {
        get: (target, property, receiver) => {
          if (property === 'createHandler') {
            return Reflect.get(target, property, receiver);
          }
          throw new Error(`Unexpected access from fake context: ${String(property)}`);
        },
      }
    );

    return {
      registerRoutes: (path: string, registerCallback: (router: IRouter) => void) => {
        const router = new Router(
          path,
          this.log,
          fakeContext.createHandler.bind(null, this.coreContext.coreId)
        );

        registerCallback(router);
        notReadySetup.registerRouterAfterListening(router);
      },
    };
  }

  private async runNotReadyServer(config: HttpConfig) {
    this.log.debug('starting NotReady server');
    this.notReadyServer = new HttpServer(this.logger, 'NotReady', of(config.shutdownTimeout));
    const notReadySetup = await this.notReadyServer.setup(config);
    notReadySetup.server.route({
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

    return notReadySetup;
  }
}
