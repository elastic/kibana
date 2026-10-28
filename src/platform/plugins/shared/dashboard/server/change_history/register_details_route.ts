/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import { z, lazySchema } from '@kbn/zod';

import { getDashboardStateSchema } from '../api/dashboard_state_schemas';
import { DASHBOARD_CHANGE_HISTORY_API_PATH } from '../../common/constants';
import { CHANGE_HISTORY_ROUTE_SECURITY, getChangeHistoryContext } from './utils';

const detailsResponseSchema = lazySchema(() => z.object({
  id: z.string(),
  timestamp: z.string(),
  actor: z.object({
    name: z.string(),
    profileId: z.string().optional(),
  }),
  action: z.string(),
  snapshot: getDashboardStateSchema(true),
  isCurrent: z.boolean(),
}));
export type ChangeDetailsResponse = z.infer<typeof detailsResponseSchema>;

export const registerChangeDetailsRoute = (router: IRouter<RequestHandlerContext>) => {
  router.get(
    {
      path: `${DASHBOARD_CHANGE_HISTORY_API_PATH}/{id}/{changeId}`,
      validate: {
        request: {
          params: z
            .object({
              id: z.string(),
              changeId: z.string(),
            })
            .strict(),
        },
        response: {
          200: {
            body: () => detailsResponseSchema,
            description: 'success',
          },
        },
      },
      security: CHANGE_HISTORY_ROUTE_SECURITY,
    },
    async (ctx, req, res) => {
      const context = await getChangeHistoryContext(ctx, req, res, req.params.id);
      if (context.error) return context.error;
      const { client, spaceId, currentSequence } = context;

      const { items } = await client.getHistory(spaceId, 'dashboard', req.params.id, {
        additionalFilters: [{ term: { 'event.id': req.params.changeId } }],
        size: 1,
      });
      const item = items[0];
      if (!item) {
        return res.notFound();
      }

      return res.ok({
        body: {
          id: req.params.changeId,
          timestamp: item['@timestamp'],
          actor: item.user,
          action: item.event.action,
          snapshot: item.object.snapshot,
          isCurrent: currentSequence !== undefined && item.object.sequence === currentSequence,
        },
      });
    }
  );
};
