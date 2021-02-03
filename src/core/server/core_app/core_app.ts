/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Path from 'path';
import { fromRoot } from '../../../core/server/utils';

import { InternalCoreSetup } from '../internal_types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';

/** @internal */
export class CoreApp {
  private readonly logger: Logger;
  constructor(core: CoreContext) {
    this.logger = core.logger.get('core-app');
  }
  setup(coreSetup: InternalCoreSetup) {
    this.logger.debug('Setting up core app.');
    this.registerDefaultRoutes(coreSetup);
    this.registerStaticDirs(coreSetup);
  }

  private registerDefaultRoutes(coreSetup: InternalCoreSetup) {
    const httpSetup = coreSetup.http;
    const router = httpSetup.createRouter('/');
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
    router.get({ path: '/core', validate: false }, async (context, req, res) =>
      res.ok({ body: { version: '0.0.1' } })
    );

    const anonymousStatusPage = coreSetup.status.isStatusPageAnonymous();
    coreSetup.httpResources.createRegistrar(router).register(
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
  private registerStaticDirs(coreSetup: InternalCoreSetup) {
    coreSetup.http.registerStaticDir('/ui/{path*}', Path.resolve(__dirname, './assets'));

    coreSetup.http.registerStaticDir(
      '/node_modules/@kbn/ui-framework/dist/{path*}',
      fromRoot('node_modules/@kbn/ui-framework/dist')
    );
  }
}
