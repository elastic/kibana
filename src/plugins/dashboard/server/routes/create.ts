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
          const cmResult = await client.create(req.body);
          result = cmResult.result as unknown as Dashboard;
        } catch (e) {
          // do some handling;
          throw e;
        }
        return res.ok({ body: result });
      }
    );
}
