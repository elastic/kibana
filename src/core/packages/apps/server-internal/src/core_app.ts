/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringify } from 'querystring';
import { Env, IConfigService } from '@kbn/config';
import { schema, ValidationError } from '@kbn/config-schema';
import { fromRoot } from '@kbn/repo-info';
import type { Logger } from '@kbn/logging';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type {
  IRouter,
  IKibanaResponse,
  KibanaResponseFactory,
  KibanaRequest,
  IBasePath,
} from '@kbn/core-http-server';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import type { HttpResources, HttpResourcesServiceToolkit } from '@kbn/core-http-resources-server';
import type {
  InternalCorePreboot,
  InternalCoreSetup,
  InternalCoreStart,
} from '@kbn/core-lifecycle-server-internal';
import type { InternalStaticAssets } from '@kbn/core-http-server-internal';
import {
  combineLatest,
  firstValueFrom,
  map,
  type Observable,
  ReplaySubject,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  timer,
} from 'rxjs';
import type { InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { CoreAppConfig, type CoreAppConfigType, CoreAppPath } from './core_app_config';
import { registerBundleRoutes } from './bundle_routes';
import type { InternalCoreAppsServiceRequestHandlerContext } from './internal_types';

/** @internal */
interface CommonRoutesParams {
  router: IRouter;
  httpResources: HttpResources;
  basePath: IBasePath;
  uiPlugins: UiPlugins;
  staticAssets: InternalStaticAssets;
  onResourceNotFound: (
    req: KibanaRequest,
    res: HttpResourcesServiceToolkit & KibanaResponseFactory
  ) => Promise<IKibanaResponse>;
}

const DYNAMIC_CONFIG_OVERRIDES_SO_TYPE = 'dynamic-config-overrides';
const DYNAMIC_CONFIG_OVERRIDES_SO_ID = 'dynamic-config-overrides';

/** @internal */
export class CoreAppsService {
  private readonly logger: Logger;
  private readonly env: Env;
  private readonly configService: IConfigService;
  private readonly config$: Observable<CoreAppConfig>;
  private readonly savedObjectsStart$ = new ReplaySubject<InternalSavedObjectsServiceStart>(1);
  private readonly stop$ = new Subject<void>();

  constructor(core: CoreContext) {
    this.logger = core.logger.get('core-app');
    this.env = core.env;
    this.configService = core.configService;
    this.config$ = this.configService
      .atPath<CoreAppConfigType>(CoreAppPath)
      .pipe(map((rawCfg) => new CoreAppConfig(rawCfg)));
  }

  preboot(corePreboot: InternalCorePreboot, uiPlugins: UiPlugins) {
    this.logger.debug('Prebooting core app.');

    // We register app-serving routes only if there are `preboot` plugins that may need them.
    if (uiPlugins.public.size > 0) {
      this.registerPrebootDefaultRoutes(corePreboot, uiPlugins);
      this.registerStaticDirs(corePreboot, uiPlugins);
    }
  }

  async setup(coreSetup: InternalCoreSetup, uiPlugins: UiPlugins) {
    this.logger.debug('Setting up core app.');
    const config = await firstValueFrom(this.config$);
    this.registerDefaultRoutes(coreSetup, uiPlugins);
    this.registerStaticDirs(coreSetup, uiPlugins);
    this.maybeRegisterDynamicConfigurationFeature({
      config,
      coreSetup,
      savedObjectsStart$: this.savedObjectsStart$,
    });
  }

  start(coreStart: InternalCoreStart) {
    this.savedObjectsStart$.next(coreStart.savedObjects);
  }

  stop() {
    this.stop$.next();
  }

  private registerPrebootDefaultRoutes(corePreboot: InternalCorePreboot, uiPlugins: UiPlugins) {
    corePreboot.http.registerRoutes('', (router) => {
      this.registerCommonDefaultRoutes({
        basePath: corePreboot.http.basePath,
        httpResources: corePreboot.httpResources.createRegistrar(router),
        staticAssets: corePreboot.http.staticAssets,
        router,
        uiPlugins,
        onResourceNotFound: async (req, res) =>
          // The API consumers might call various Kibana APIs (e.g. `/api/status`) when Kibana is still at the preboot
          // stage, and the main HTTP server that registers API handlers isn't up yet. At this stage we don't know if
          // the API endpoint exists or not, and hence cannot reply with `404`. We also should not reply with completely
          // unexpected response (`200 text/html` for the Core app). The only suitable option is to reply with `503`
          // like we do for all other unknown non-GET requests at the preboot stage.
          req.route.path.startsWith('/api/') || req.route.path.startsWith('/internal/')
            ? res.customError({
                statusCode: 503,
                headers: { 'Retry-After': '30' },
                body: 'Kibana server is not ready yet',
                bypassErrorFormat: true,
              })
            : res.renderCoreApp(),
      });
    });
  }

  private registerDefaultRoutes(coreSetup: InternalCoreSetup, uiPlugins: UiPlugins) {
    const httpSetup = coreSetup.http;
    const router = httpSetup.createRouter<InternalCoreAppsServiceRequestHandlerContext>('');
    const resources = coreSetup.httpResources.createRegistrar(router);

    router.get(
      { path: '/', validate: false, options: { access: 'public' } },
      async (context, req, res) => {
        const { uiSettings } = await context.core;
        let defaultRoute = await uiSettings.client.get<string>('defaultRoute', { request: req });
        if (!defaultRoute) {
          defaultRoute = '/app/home';
        }
        const basePath = httpSetup.basePath.get(req);
        const url = `${basePath}${defaultRoute}`;

        return res.redirected({
          headers: {
            location: url,
          },
        });
      }
    );

    this.registerCommonDefaultRoutes({
      basePath: coreSetup.http.basePath,
      httpResources: resources,
      staticAssets: coreSetup.http.staticAssets,
      router,
      uiPlugins,
      onResourceNotFound: async (req, res) => res.notFound(),
    });

    resources.register(
      {
        path: '/app/{id}/{any*}',
        validate: false,
        options: {
          authRequired: true,
        },
      },
      async (context, request, response) => {
        return response.renderCoreApp();
      }
    );

    const anonymousStatusPage = coreSetup.status.isStatusPageAnonymous();
    resources.register(
      {
        path: '/status',
        validate: false,
        options: {
          authRequired: !anonymousStatusPage,
        },
      },
      async (context, request, response) => {
        if (anonymousStatusPage) {
          return response.renderAnonymousCoreApp();
        } else {
          return response.renderCoreApp();
        }
      }
    );
  }

  private maybeRegisterDynamicConfigurationFeature({
    config,
    coreSetup,
    savedObjectsStart$,
  }: {
    config: CoreAppConfig;
    coreSetup: InternalCoreSetup;
    savedObjectsStart$: Observable<InternalSavedObjectsServiceStart>;
  }) {
    // Always registering the Saved Objects to avoid ON/OFF conflicts in the migrations
    coreSetup.savedObjects.registerType({
      name: DYNAMIC_CONFIG_OVERRIDES_SO_TYPE,
      hidden: true,
      hiddenFromHttpApis: true,
      namespaceType: 'agnostic',
      mappings: {
        dynamic: false,
        properties: {},
      },
    });

    if (config.allowDynamicConfigOverrides) {
      const savedObjectsClient$ = savedObjectsStart$.pipe(
        map((savedObjectsStart) =>
          savedObjectsStart.createInternalRepository([DYNAMIC_CONFIG_OVERRIDES_SO_TYPE])
        ),
        shareReplay(1)
      );

      // Register the HTTP route
      const router = coreSetup.http.createRouter<InternalCoreAppsServiceRequestHandlerContext>('');
      this.registerInternalCoreSettingsRoute(router, savedObjectsClient$);

      let latestOverrideVersion: string | undefined; // Use the document version to avoid calling override on every poll
      // Poll for updates
      combineLatest([savedObjectsClient$, timer(0, 10_000)])
        .pipe(
          switchMap(async ([soClient]) => {
            try {
              const persistedOverrides = await soClient.get<Record<string, unknown>>(
                DYNAMIC_CONFIG_OVERRIDES_SO_TYPE,
                DYNAMIC_CONFIG_OVERRIDES_SO_ID
              );
              if (latestOverrideVersion !== persistedOverrides.version) {
                this.configService.setDynamicConfigOverrides(persistedOverrides.attributes);
                latestOverrideVersion = persistedOverrides.version;
                this.logger.info('Succeeded in applying persisted dynamic config overrides');
              }
            } catch (err) {
              // Potential failures:
              // - The SO document does not exist (404 error) => no need to log
              // - The configuration overrides are invalid => they won't be applied and the validation error will be logged.
              if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
                this.logger.warn(`Failed to apply the persisted dynamic config overrides: ${err}`);
              }
            }
          }),
          takeUntil(this.stop$)
        )
        .subscribe();
    }
  }

  /**
   * Registers the HTTP API that allows updating in-memory the settings that opted-in to be dynamically updatable.
   * @param router {@link IRouter}
   * @param savedObjectClient$ An observable of a {@link SavedObjectsClientContract | savedObjects client} that will be used to update the document
   * @private
   */
  private registerInternalCoreSettingsRoute(
    router: IRouter,
    savedObjectClient$: Observable<SavedObjectsClientContract>
  ) {
    router.versioned
      .put({
        path: '/internal/core/_settings',
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['updateDynamicConfig'],
          },
        },
      })
      .addVersion(
        {
          version: '1',
          validate: {
            request: {
              body: schema.recordOf(schema.string(), schema.any()),
            },
            response: {
              '200': { body: () => schema.object({ ok: schema.boolean() }) },
            },
          },
        },
        async (context, req, res) => {
          try {
            const newGlobalOverrides = this.configService.setDynamicConfigOverrides(req.body);
            const soClient = await firstValueFrom(savedObjectClient$);
            await soClient.create(DYNAMIC_CONFIG_OVERRIDES_SO_TYPE, newGlobalOverrides, {
              id: DYNAMIC_CONFIG_OVERRIDES_SO_ID,
              overwrite: true,
              refresh: false,
            });
            // set it again in memory in case the timer polling the SO for updates has overridden it during this update.
            this.configService.setDynamicConfigOverrides(req.body);
          } catch (err) {
            if (err instanceof ValidationError) {
              return res.badRequest({ body: err });
            }
            throw err;
          }

          return res.ok({ body: { ok: true } });
        }
      );
  }

  private registerCommonDefaultRoutes({
    router,
    basePath,
    staticAssets,
    uiPlugins,
    onResourceNotFound,
    httpResources,
  }: CommonRoutesParams) {
    // catch-all route
    httpResources.register(
      {
        path: '/{path*}',
        validate: {
          params: schema.object({
            path: schema.maybe(schema.string()),
          }),
          query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
        },
      },
      async (context, req, res) => {
        const { query, params } = req;
        const { path } = params;
        if (!path || !path.endsWith('/') || path.startsWith('/')) {
          return onResourceNotFound(req, res);
        }

        // remove trailing slash
        const requestBasePath = basePath.get(req);
        let rewrittenPath = path.slice(0, -1);
        if (`/${path}`.startsWith(requestBasePath)) {
          rewrittenPath = rewrittenPath.substring(requestBasePath.length);
        }

        const querystring = query ? stringify(query) : undefined;
        const url = `${requestBasePath}/${encodeURIComponent(rewrittenPath)}${
          querystring ? `?${querystring}` : ''
        }`;

        return res.redirected({
          headers: {
            location: url,
          },
        });
      }
    );

    router.get({ path: '/core', validate: false }, async (context, req, res) =>
      res.ok({ body: { version: '0.0.1' } })
    );

    registerBundleRoutes({
      router,
      uiPlugins,
      staticAssets,
      packageInfo: this.env.packageInfo,
    });
  }

  // After the package is built and bootstrap extracts files to bazel-bin,
  // assets are exposed at the root of the package and in the package's node_modules dir
  private registerStaticDirs(core: InternalCoreSetup | InternalCorePreboot, uiPlugins: UiPlugins) {
    /**
     * Serve UI from sha-scoped and not-sha-scoped paths to allow time for plugin code to migrate
     * Eventually we only want to serve from the sha scoped path
     */
    [core.http.staticAssets.prependServerPath('/ui/{path*}'), '/ui/{path*}'].forEach((path) => {
      core.http.registerStaticDir(
        path,
        fromRoot('node_modules/@kbn/core-apps-server-internal/assets')
      );
    });

    for (const [pluginName, pluginInfo] of uiPlugins.internal) {
      if (!pluginInfo.publicAssetsDir) continue;
      /**
       * Serve UI from sha-scoped and not-sha-scoped paths to allow time for plugin code to migrate
       * Eventually we only want to serve from the sha scoped path
       */
      [
        core.http.staticAssets.getPluginServerPath(pluginName, '{path*}'),
        `/plugins/${pluginName}/assets/{path*}`,
      ].forEach((path) => {
        core.http.registerStaticDir(path, pluginInfo.publicAssetsDir);
      });
    }
  }
}
