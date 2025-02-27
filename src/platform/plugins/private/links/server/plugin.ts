/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import { schema } from '@kbn/config-schema';
import { CONTENT_ID, LATEST_VERSION } from '../common';
import { LinksAttributes } from '../common/content_management';
import { LinksStorage } from './content_management';
import { linksSavedObjectType } from './saved_objects';

export class LinksServerPlugin implements Plugin<object, object> {
  private readonly logger: Logger;

  constructor(private initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<{ dashboard: DashboardPluginStart }>,
    plugins: {
      contentManagement: ContentManagementServerSetup;
    }
  ) {
    plugins.contentManagement.register({
      id: CONTENT_ID,
      storage: new LinksStorage({
        throwOnResultValidationError: this.initializerContext.env.mode.dev,
        logger: this.logger.get('storage'),
      }),
      version: {
        latest: LATEST_VERSION,
      },
    });

    core.savedObjects.registerType<LinksAttributes>(linksSavedObjectType);

    const router = core.http.createRouter();

    router.get(
      {
        path: '/api/search_dashboards',
        validate: {
          query: schema.object({
            spaces: schema.maybe(
              schema.oneOf([schema.string(), schema.literal('*')], {
                meta: { description: 'Comma separated list of spaces or "*" for all spaces' },
              })
            ),
            text: schema.maybe(schema.string()),
          }),
        },
      },
      async (context, req, res) => {
        const [_, { dashboard }] = await core.getStartServices();
        const { text, spaces: spacesString } = req.query;
        const spaces = spacesString?.split(',');
        const { contentClient } = dashboard;
        const dashboardClient = contentClient!.getForRequest({
          requestHandlerContext: context,
          request: req,
          version: 3,
        });
        const dashboards = await dashboardClient.search({ text }, { spaces });
        return res.ok({ body: dashboards });
      }
    );

    return {};
  }

  public start(core: CoreStart, { dashboard }: { dashboard: DashboardPluginStart }) {
    return {};
  }

  public stop() {}
}
