/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { VersionedRouter } from '@kbn/core-http-server';
import { LATEST_VERSION } from '@kbn/data-views-plugin/common';
import { Dashboard } from '../../common/api/2023_10_31';
import { v2023_10_31 } from '../../common/api';
import { DashboardStorage } from '../content_management';

export function registerCreate(router: VersionedRouter, cmStorage: DashboardStorage) {
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
        const { id: reqId, ...attrs } = req.body;
        let result: Dashboard;
        try {
          ({ item: result } = await cmStorage.create(
            {} as any,
            {
              ...attrs,
              timeRestore: attrs.timeRestore ?? false,
              kibanaSavedObjectMeta: {
                searchSourceJSON: attrs.kibanaSavedObjectMeta.searchSourceJSON ?? '',
              },
              panelsJSON: attrs.panelsJSON ?? '[]',
              version: LATEST_VERSION,
            },
            { id: req.body.id }
          ));
        } catch (e) {
          // do some handling;
          throw e;
        }
        return res.ok({ body: result });
      }
    );
}
