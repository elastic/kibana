/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { stringify } from 'querystring';
import { Env } from '@kbn/config';
import { schema } from '@kbn/config-schema';
import { fromRoot } from '@kbn/utils';

import { IRouter, IBasePath, IKibanaResponse, KibanaResponseFactory } from '../http';
import { HttpResources, HttpResourcesServiceToolkit } from '../http_resources';
import { InternalCorePreboot, InternalCoreSetup } from '../internal_types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { registerBundleRoutes } from './bundle_routes';
import { UiPlugins } from '../plugins';

/** @internal */
interface CommonRoutesParams {
  router: IRouter;
  httpResources: HttpResources;
  basePath: IBasePath;
  uiPlugins: UiPlugins;
  onResourceNotFound: (
    res: HttpResourcesServiceToolkit & KibanaResponseFactory
  ) => Promise<IKibanaResponse>;
}

/** @internal */
export class CoreApp {
  private readonly logger: Logger;
  private readonly env: Env;

  constructor(core: CoreContext) {
    this.logger = core.logger.get('core-app');
    this.env = core.env;
  }

  preboot(corePreboot: InternalCorePreboot, uiPlugins: UiPlugins) {
    this.logger.debug('Prebooting core app.');

    // We register app-serving routes only if there are `preboot` plugins that may need them.
    if (uiPlugins.public.size > 0) {
      this.registerPrebootDefaultRoutes(corePreboot, uiPlugins);
      this.registerStaticDirs(corePreboot);
    }
  }

  setup(coreSetup: InternalCoreSetup, uiPlugins: UiPlugins) {
    this.logger.debug('Setting up core app.');
    this.registerDefaultRoutes(coreSetup, uiPlugins);
    this.registerStaticDirs(coreSetup);
  }

  private registerPrebootDefaultRoutes(corePreboot: InternalCorePreboot, uiPlugins: UiPlugins) {
    corePreboot.http.registerRoutes('', (router) => {
      this.registerCommonDefaultRoutes({
        basePath: corePreboot.http.basePath,
        httpResources: corePreboot.httpResources.createRegistrar(router),
        router,
        uiPlugins,
        onResourceNotFound: (res) => res.renderAnonymousCoreApp(),
      });
    });
  }

  private registerDefaultRoutes(coreSetup: InternalCoreSetup, uiPlugins: UiPlugins) {
    const httpSetup = coreSetup.http;
    const router = httpSetup.createRouter('');
    const resources = coreSetup.httpResources.createRegistrar(router);

    router.get({ path: '/', validate: false }, async (context, req, res) => {
      const defaultRoute = await context.core.uiSettings.client.get<string>('defaultRoute');
      const basePath = httpSetup.basePath.get(req);
      const url = `${basePath}${defaultRoute}`;

      return res.redirected({
        headers: {
          location: url,
        },
      });
    });

    this.registerCommonDefaultRoutes({
      basePath: coreSetup.http.basePath,
      httpResources: resources,
      router,
      uiPlugins,
      onResourceNotFound: async (res) => res.notFound(),
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

  private registerCommonDefaultRoutes({
    router,
    basePath,
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
          return onResourceNotFound(res);
        }

        // remove trailing slash
        const requestBasePath = basePath.get(req);
        let rewrittenPath = path.slice(0, -1);
        if (`/${path}`.startsWith(requestBasePath)) {
          rewrittenPath = rewrittenPath.substring(requestBasePath.length);
        }

        const querystring = query ? stringify(query) : undefined;
        const url = `${requestBasePath}/${rewrittenPath}${querystring ? `?${querystring}` : ''}`;

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
      packageInfo: this.env.packageInfo,
      serverBasePath: basePath.serverBasePath,
    });
  }

  private registerStaticDirs(core: InternalCoreSetup | InternalCorePreboot) {
    core.http.registerStaticDir('/ui/{path*}', Path.resolve(__dirname, './assets'));

    core.http.registerStaticDir(
      '/node_modules/@kbn/ui-framework/dist/{path*}',
      fromRoot('node_modules/@kbn/ui-framework/dist')
    );
  }
}
