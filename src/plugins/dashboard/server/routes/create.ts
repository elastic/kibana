/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { CONTENT_ID } from '@kbn/visualizations-plugin/common/content_management';
import type { Dashboard } from '../../common/api/2023_10_31';
import { v2023_10_31 } from '../../common/api';

export function registerCreate(
  router: VersionedRouter<RequestHandlerContext>,
  cm: ContentManagementServerSetup
) {
  router
    .post({
      path: '/api/dashboard',
      access: 'public',
      description: 'Create a dashboard',
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: v2023_10_31.dashboardCreate,
          },
          response: {
            200: { body: v2023_10_31.dashboard },
          },
        },
      },
      async (ctx, req, res) => {
        const client = cm.contentClient
          .getForRequest({ request: req, requestHandlerContext: ctx })
          .for<Dashboard>(CONTENT_ID);
        let result: Dashboard;
        try {
          ({
            result: { item: result },
          } = await client.create(req.body));
        } catch (e) {
          // do some handling;
          throw e;
        }
        // This is the translation layer from storage to public endpoint
        const body: Dashboard = {
          id: result.id,
          description: result.description,
          title: result.title,
          kibanaSavedObjectMeta: result.kibanaSavedObjectMeta,
          timeRestore: result.timeRestore,
          timeFrom: result.timeFrom,
          optionsJSON: result.optionsJSON,
          panelsJSON: result.panelsJSON,
          controlGroupInput: result.controlGroupInput,
          refreshInterval: result.refreshInterval,
          timeTo: result.timeTo,
        };
        return res.ok({ body });
      }
    );
}
