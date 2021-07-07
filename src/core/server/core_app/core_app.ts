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

import { IRouter, IBasePath } from '../http';
import { InternalCorePreboot, InternalCoreSetup } from '../internal_types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { registerBundleRoutes } from './bundle_routes';
import { UiPlugins } from '../plugins';

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
      const resources = corePreboot.httpResources.createRegistrar(router);
      resources.register(
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
            return res.renderAnonymousCoreApp();
          }

          // remove trailing slash
          const basePath = corePreboot.http.basePath.get(req);
          let rewrittenPath = path.slice(0, -1);
          if (`/${path}`.startsWith(basePath)) {
            rewrittenPath = rewrittenPath.substring(basePath.length);
          }

          const querystring = query ? stringify(query) : undefined;
          const url = `${basePath}/${rewrittenPath}${querystring ? `?${querystring}` : ''}`;

          return res.redirected({
            headers: {
              location: url,
            },
          });
        }
      );

      this.registerCommonDefaultRoutes(router, corePreboot.http.basePath, uiPlugins);
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

    // remove trailing slash catch-all
    router.get(
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
          return res.notFound();
        }

        const basePath = httpSetup.basePath.get(req);
        let rewrittenPath = path.slice(0, -1);
        if (`/${path}`.startsWith(basePath)) {
          rewrittenPath = rewrittenPath.substring(basePath.length);
        }

        const querystring = query ? stringify(query) : undefined;
        const url = `${basePath}/${rewrittenPath}${querystring ? `?${querystring}` : ''}`;

        return res.redirected({
          headers: {
            location: url,
          },
        });
      }
    );

    this.registerCommonDefaultRoutes(router, coreSetup.http.basePath, uiPlugins);

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

  private registerCommonDefaultRoutes(router: IRouter, basePath: IBasePath, uiPlugins: UiPlugins) {
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
