/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import { z } from '@kbn/zod';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';

import { getDashboardStateSchema } from '../api/dashboard_state_schemas';
import { DASHBOARD_CHANGE_HISTORY_API_PATH } from '../../common/constants';
import { CHANGE_HISTORY_ROUTE_SECURITY, getChangeHistoryContext } from './utils';
import { update } from '../api/update/update';

export type RestoreChangeResponse = DashboardState;

export const registerRestoreChangeRoute = (router: IRouter<RequestHandlerContext>) => {
  router.post(
    {
      path: `${DASHBOARD_CHANGE_HISTORY_API_PATH}/{id}/{changeId}/_restore`,
      validate: {
        request: {
          params: z
            .object({
              // can not validate id at route level
              // existing dashboards may have invalid "as code" ids
              id: z.string(),
              changeId: z.string(),
            })
            .strict(),
        },
        response: {
          200: {
            body: () => getDashboardStateSchema(true, true),
            description: 'success',
          },
        },
      },
      security: CHANGE_HISTORY_ROUTE_SECURITY,
    },
    async (ctx, req, res) => {
      const context = await getChangeHistoryContext(ctx, req, res, req.params.id);
      if (context.error) return context.error;
      const { client, spaceId } = context;

      const { items } = await client.getHistory(spaceId, 'dashboard', req.params.id, {
        additionalFilters: [{ term: { 'event.id': req.params.changeId } }],
        size: 1,
      });
      const item = items[0];
      if (!item) {
        return res.notFound();
      }

      const result = await update(
        ctx,
        getDashboardStateSchema(true, true),
        req.params.id,
        item.object.snapshot as DashboardState,
        { spaceId, isDashboardAppRequest: true, restoredFrom: item.object.sequence }
      );
      return res.ok({ body: result.body.data });
    }
  );
};
