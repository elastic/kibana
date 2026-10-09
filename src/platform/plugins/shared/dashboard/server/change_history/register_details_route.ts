/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeIdSchema } from '@kbn/as-code-shared-schemas';
import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import { z } from '@kbn/zod';

import { getDashboardStateSchema } from '../api/dashboard_state_schemas';
import { CHANGE_HISTORY_ROUTE_SECURITY, getChangeHistoryContext } from './route_utils';

const detailsResponseSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actor: z.object({
    name: z.string(),
    profileId: z.string().optional(),
  }),
  action: z.string(),
  snapshot: getDashboardStateSchema(true),
  isCurrent: z.boolean(),
});
export type ChangeDetailsResponse = z.infer<typeof detailsResponseSchema>;

export const registerChangeDetailsRoute = (router: IRouter<RequestHandlerContext>) => {
  router.get(
    {
      path: '/internal/dashboard/change_history/{id}/{changeId}',
      validate: {
        request: {
          params: z
            .object({
              id: asCodeIdSchema,
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
      const context = await getChangeHistoryContext(ctx, req, res);
      if (context.error) return context.error;
      const { client, spaceId } = context;

      const [{ items }, { items: currentHistoryItem }] = await Promise.all([
        client.getHistory(spaceId, 'dashboard', req.params.id, {
          additionalFilters: [{ term: { 'event.id': req.params.changeId } }],
          size: 1,
        }),
        client.getHistory(spaceId, 'dashboard', req.params.id, { size: 1 }),
      ]);
      const item = items[0];
      if (!item) {
        return res.notFound();
      }
      const currentHistoryId = currentHistoryItem[0]?.event.id;

      return res.ok({
        body: {
          id: req.params.changeId,
          timestamp: item['@timestamp'],
          actor: item.user,
          action: item.event.action,
          snapshot: item.object.snapshot,
          isCurrent: item.event.id === currentHistoryId,
        },
      });
    }
  );
};
