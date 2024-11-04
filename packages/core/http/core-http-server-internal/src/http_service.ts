/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable, Subscription, combineLatest, firstValueFrom, of, mergeMap } from 'rxjs';
import { map } from 'rxjs';
import { schema, TypeOf } from '@kbn/config-schema';

import { pick, Semaphore } from '@kbn/std';
import {
  generateOpenApiDocument,
  type GenerateOpenApiDocumentOptionsFilters,
} from '@kbn/router-to-openapispec';
import { Logger } from '@kbn/logging';
import { Env } from '@kbn/config';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import type {
  RequestHandlerContextBase,
  IContextContainer,
  IContextProvider,
  IRouter,
} from '@kbn/core-http-server';
import type {
  InternalContextSetup,
  InternalContextPreboot,
} from '@kbn/core-http-context-server-internal';
import { Router, RouterOptions } from '@kbn/core-http-router-server-internal';

import { CspConfigType, cspConfig } from './csp';
import { PermissionsPolicyConfigType, permissionsPolicyConfig } from './permissions_policy';
import { HttpConfig, HttpConfigType, config as httpConfig } from './http_config';
import { HttpServer } from './http_server';
import { HttpsRedirectServer } from './https_redirect_server';
import {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
  InternalHttpServiceStart,
} from './types';
import { registerCoreHandlers } from './register_lifecycle_handlers';
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
  private static readonly generateOasSemaphore = new Semaphore(1);
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
      configService.atPath<HttpConfigType>(httpConfig.path, { ignoreUnchanged: false }),
      configService.atPath<CspConfigType>(cspConfig.path),
      configService.atPath<ExternalUrlConfigType>(externalUrlConfig.path),
      configService.atPath<PermissionsPolicyConfigType>(permissionsPolicyConfig.path),
    ]).pipe(
      map(
        ([http, csp, externalUrl, permissionsPolicy]) =>
          new HttpConfig(http, csp, externalUrl, permissionsPolicy)
      )
    );
    const shutdownTimeout$ = this.config$.pipe(map(({ shutdownTimeout }) => shutdownTimeout));
    this.prebootServer = new HttpServer(coreContext, 'Preboot', shutdownTimeout$);
    this.httpServer = new HttpServer(coreContext, 'Kibana', shutdownTimeout$);
    this.httpsRedirectServer = new HttpsRedirectServer(logger.get('http', 'redirect', 'server'));
  }

  public async preboot(deps: PrebootDeps): Promise<InternalHttpServicePreboot> {
    this.log.debug('setting up preboot server');
    const config = await firstValueFrom(this.config$);

    const prebootSetup = await this.prebootServer.setup({
      config$: this.config$,
    });
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

    registerCoreHandlers(prebootSetup, config, this.env, this.log);

    if (this.shouldListen(config)) {
      this.log.debug('starting preboot server');
      await this.prebootServer.start();
    }

    const prebootServerRequestHandlerContext = deps.context.createContextContainer();
    this.internalPreboot = {
      externalUrl: new ExternalUrlConfig(config.externalUrl),
      csp: prebootSetup.csp,
      staticAssets: prebootSetup.staticAssets,
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
          prebootServerRequestHandlerContext.createHandler.bind(null, this.coreContext.coreId),
          {
            isDev: this.env.mode.dev,
            versionedRouterOptions: getVersionedRouterOptions(config),
          }
        );

        registerCallback(router);

        prebootSetup.registerRouterAfterListening(router);
      },
      getServerInfo: prebootSetup.getServerInfo,
    };

    return this.internalPreboot;
  }

  public async setup(deps: SetupDeps): Promise<InternalHttpServiceSetup> {
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

    const { registerRouter, ...serverContract } = await this.httpServer.setup({
      config$: this.config$,
      executionContext: deps.executionContext,
    });

    registerCoreHandlers(serverContract, config, this.env, this.log);

    this.internalSetup = {
      ...serverContract,
      registerOnPostValidation: (cb) => {
        Router.on('onPostValidate', cb);
      },
      getRegisteredDeprecatedApis: () => serverContract.getDeprecatedRoutes(),
      externalUrl: new ExternalUrlConfig(config.externalUrl),
      createRouter: <Context extends RequestHandlerContextBase = RequestHandlerContextBase>(
        path: string,
        pluginId: PluginOpaqueId = this.coreContext.coreId
      ) => {
        const enhanceHandler = this.requestHandlerContext!.createHandler.bind(null, pluginId);
        const router = new Router<Context>(path, this.log, enhanceHandler, {
          isDev: this.env.mode.dev,
          versionedRouterOptions: getVersionedRouterOptions(config),
          pluginId,
        });
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
    };

    return this.internalSetup;
  }

  // this method exists because we need the start contract to create the `CoreStart` used to start
  // the `plugin` and `legacy` services.
  public getStartContract(): InternalHttpServiceStart {
    return {
      ...pick(this.internalSetup!, ['auth', 'basePath', 'getServerInfo', 'staticAssets']),
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

      if (config.oas.enabled) {
        this.log.info('Registering experimental OAS API');
        this.registerOasApi(config);
      }

      await this.httpServer.start();
    }

    return this.getStartContract();
  }

  private registerOasApi(config: HttpConfig) {
    const basePath = this.internalSetup?.basePath;
    const server = this.internalSetup?.server;
    if (!basePath || !server) {
      throw new Error('Cannot register OAS API before server setup is complete');
    }

    const baseUrl =
      basePath.publicBaseUrl ?? `http://localhost:${config.port}${basePath.serverBasePath}`;

    const stringOrStringArraySchema = schema.oneOf([
      schema.string(),
      schema.arrayOf(schema.string()),
    ]);
    const querySchema = schema.object({
      access: schema.oneOf([schema.literal('public'), schema.literal('internal')], {
        defaultValue: 'public' as const,
      }),
      version: schema.maybe(schema.string()),
      excludePathsMatching: schema.maybe(stringOrStringArraySchema),
      pathStartsWith: schema.maybe(stringOrStringArraySchema),
      pluginId: schema.maybe(schema.string()),
    });

    server.route({
      path: '/api/oas',
      method: 'GET',
      handler: async (req, h) => {
        const routers = this.httpServer.getRouters();

        const data = routers.routers
          .map((router) => router.getRoutes({ excludeVersionedRoutes: false }))
          .flat()
          .reduce(
            (acc, route) => {
              const security = route.isVersioned ? route.security({ headers: {} }) : route.security;
              const isVersioned = route.isVersioned;
              const isMigratedClassicRoute = route.security && !route.isVersioned;

              const isMigratedVersionedRoute = route.isVersioned && route.security({ headers: {} });

              if (isMigratedClassicRoute) {
                if (security.authz.enabled !== false) {
                  acc.classic.migratedWithAuthz++;
                } else if (security.authz.enabled === false) {
                  acc.classic.migratedWithoutAuthz++;
                }

                return acc;
              }

              if (isMigratedVersionedRoute) {
                if (security.authz.enabled !== false) {
                  acc.versioned.migratedWithAuthz++;
                } else if (security.authz.enabled === false) {
                  acc.versioned.migratedWithoutAuthz++;
                }

                return acc;
              }

              if (!route.path.startsWith('/XXXXXXXXXXXX')) {
                const routerType = route.isVersioned ? 'versioned' : 'classic';
                if (route.options.tags?.some((tag) => tag.startsWith('access:'))) {
                  acc[routerType].nonMigratedAuthz++;
                } else {
                  acc[routerType].nonMigratedNoAuthz++;
                }
              }

              return acc;
            },
            {
              versioned: {
                migratedWithAuthz: 0,
                migratedWithoutAuthz: 0,
                nonMigratedAuthz: 0,
                nonMigratedNoAuthz: 0,
              },
              classic: {
                migratedWithAuthz: 0,
                migratedWithoutAuthz: 0,
                nonMigratedAuthz: 0,
                nonMigratedNoAuthz: 0,
              },
            }
          );

        return data;

        const routes = routers.routers
          .map((router) => router.getRoutes({ excludeVersionedRoutes: false }))
          .flat()
          .filter(
            (route) =>
              ((!route.security && !route.isVersioned) ||
                (route.isVersioned && !route.security({ headers: {} }))) &&
              !route.path.startsWith('/XXXXXXXXXXXX')
          )
          .map((route) => {
            let owner = 'unknown';

            if (
              [
                '/internal/apm',
                '/api/apm',
                '/api/infra',
                '/internal/dataset_quality',
                '/api/log_entries',
                '/api/logs_shared',
              ].some((path) => route.path.startsWith(path))
            ) {
              owner = '@elastic/obs-ux-logs-team';
            }

            if (
              route.path.startsWith('/internal/synthetics') ||
              route.path.startsWith('/api/synthetics') ||
              route.path.startsWith('/internal/uptime') ||
              route.path.startsWith('/internal/observability/slos') ||
              route.path.startsWith('/api/observability/slos') ||
              route.path.startsWith('/internal/slo') ||
              route.path.startsWith('/api/snapshot_restore') ||
              route.path.startsWith('/api/observability/rules/alerts')
            ) {
              owner = '@elastic/obs-ux-management-team';
            }

            if (
              route.path.startsWith('/api/files') ||
              route.path.startsWith('/internal/content_management') ||
              route.path.startsWith('/internal/reporting')
            ) {
              owner = '@elastic/appex-sharedux';
            }

            if (route.path.startsWith('/internal/rac/alerts')) {
              owner = '@elastic/response-ops @elastic/obs-ux-management-team';
            }

            if (
              route.path.startsWith('/internal/observability_ai_assistant') ||
              route.path.startsWith('/api/observability_ai_assistant') ||
              route.path.startsWith('/internal/observability/assistant')
            ) {
              owner = '@elastic/obs-ai-assistant';
            }

            if (route.path.startsWith('/api/metrics')) {
              owner = '@elastic/obs-ux-logs-team @elastic/obs-ux-infra_services-team';
            }

            if (route.path.startsWith('/internal/observability_onboarding')) {
              owner = '@elastic/obs-ux-logs-team @elastic/obs-ux-onboarding-team';
            }

            if (route.path.startsWith('/internal/inventory')) {
              owner = '@elastic/obs-ux-infra_services-team';
            }

            if (
              route.path.startsWith('/api/cases') ||
              route.path.startsWith('/internal/cases') ||
              route.path.startsWith('/internal/triggers_actions_ui') ||
              route.path.startsWith('/api/alerting') ||
              route.path.startsWith('/internal/alerting')
            ) {
              owner = '@elastic/response-ops';
            }

            if (
              route.path.startsWith('/api/console') ||
              route.path.startsWith('/api/upgrade_assistant') ||
              route.path.startsWith('/api/watcher') ||
              route.path.startsWith('/api/index_lifecycle_management') ||
              route.path.startsWith('/api/cross_cluster_replication') ||
              route.path.startsWith('/api/rollup') ||
              route.path.startsWith('/api/index_management') ||
              route.path.startsWith('/internal/index_management')
            ) {
              owner = '@elastic/kibana-management';
            }

            if (
              route.path.startsWith('/internal/saved_objects') ||
              route.path.startsWith('/api/saved_objects') ||
              route.path.startsWith('/api/kibana') ||
              route.path.startsWith('/internal/kibana') ||
              route.path.startsWith('/api/core') ||
              route.path.startsWith('/api/deprecations') ||
              route.path.startsWith('/core') ||
              route.path.startsWith('/status')
            ) {
              owner = '@elastic/kibana-core';
            }

            if (
              route.path.startsWith('/internal/spaces') ||
              route.path.startsWith('/api/spaces') ||
              route.path.startsWith('/spaces') ||
              route.path.startsWith('/internal/security') ||
              route.path.startsWith('/api/security') ||
              route.path.startsWith('/login') ||
              route.path.startsWith('/logout') ||
              route.path.startsWith('/security')
            ) {
              owner = '@elastic/kibana-security';
            }

            if (
              route.path.startsWith('/internal/workplace_search') ||
              route.path.startsWith('/internal/enterprise_search') ||
              route.path.startsWith('/internal/app_search')
            ) {
              owner = '@elastic/search-kibana';
            }

            if (
              route.path.startsWith('/internal/monitoring') ||
              route.path.startsWith('/api/monitoring')
            ) {
              owner = '@elastic/stack-monitoring';
            }

            if (
              route.path.startsWith('/api/detection_engine') ||
              route.path.startsWith('/internal/detection_engine')
            ) {
              owner = '@elastic/security-detection-rule-management';
            }

            if (route.path.startsWith('/internal/entities')) {
              owner = '@elastic/obs-entities';
            }

            if (route.path.startsWith('/api/timeline') || route.path.startsWith('/api/endpoint')) {
              owner = '@elastic/security-solution';
            }

            return {
              owner,
              tags: route.options.tags?.filter((tag) => tag.startsWith('access')) ?? [],
              versioned: route.isVersioned,
              path: route.path,
            };
          })
          .filter(({ owner }) => owner !== 'unknown');
        // .map(({ route }) => route.path);

        return [...new Set(routes)];

        // let filters: GenerateOpenApiDocumentOptionsFilters;
        // let query: TypeOf<typeof querySchema>;
        // try {
        //   query = querySchema.validate(req.query);
        //   filters = {
        //     ...query,
        //     excludePathsMatching:
        //       typeof query.excludePathsMatching === 'string'
        //         ? [query.excludePathsMatching]
        //         : query.excludePathsMatching,
        //     pathStartsWith:
        //       typeof query.pathStartsWith === 'string'
        //         ? [query.pathStartsWith]
        //         : query.pathStartsWith,
        //   };
        // } catch (e) {
        //   return h.response({ message: e.message }).code(400);
        // }
        // return await firstValueFrom(
        //   of(1).pipe(
        //     HttpService.generateOasSemaphore.acquire(),
        //     mergeMap(async () => {
        //       try {
        //         // Potentially quite expensive
        //         const result = generateOpenApiDocument(
        //           this.httpServer.getRouters({ pluginId: query.pluginId }),
        //           {
        //             baseUrl,
        //             title: 'Kibana HTTP APIs',
        //             version: '0.0.0', // TODO get a better version here
        //             filters,
        //           }
        //         );
        //         return h.response(result);
        //       } catch (e) {
        //         this.log.error(e);
        //         return h.response({ message: e.message }).code(500);
        //       }
        //     })
        //   )
        // );
      },
      options: {
        app: { access: 'public' },
        auth: false,
        cache: {
          privacy: 'public',
          otherwise: 'must-revalidate',
        },
      },
    });
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

function getVersionedRouterOptions(config: HttpConfig): RouterOptions['versionedRouterOptions'] {
  return {
    defaultHandlerResolutionStrategy: config.versioned.versionResolution,
    useVersionResolutionStrategyForInternalPaths:
      config.versioned.useVersionResolutionStrategyForInternalPaths,
  };
}
