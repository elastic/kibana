/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { asCodeIdSchema } from '@kbn/as-code-shared-schemas';
import type { CoreSetup, IRouter, RequestHandlerContext } from '@kbn/core/server';
import { z } from '@kbn/zod';

import type { StartDeps } from '../plugin';
import type { DashboardPluginStart } from '../types';
import { CHANGE_HISTORY_ROUTE_SECURITY, getChangeHistoryContext } from './route_utils';

const listResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      timestamp: z.string(),
      actor: z.object({ name: z.string(), id: z.string().optional() }),
      action: z.string(),
      changes: z.object({ count: z.number(), summary: z.any().optional() }).optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    })
  ),
  total: z.number(),
});
export type HistoryListResponse = z.infer<typeof listResponseSchema>;

export const registerHistoryListRoute = (
  coreSetup: CoreSetup<StartDeps, DashboardPluginStart>,
  router: IRouter<RequestHandlerContext>
) => {
  router.get(
    {
      path: '/internal/dashboard/change_history/{id}',
      validate: {
        request: {
          params: z
            .object({
              id: asCodeIdSchema,
            })
            .strict(),
          query: z
            .object({
              page: z.coerce.number().optional(),
              per_page: z.coerce.number().optional(),
            })
            .strict(),
        },
        response: {
          200: {
            body: () => listResponseSchema,
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

      const { page = 1, per_page: perPage } = req.query;
      const { total, items } = await client.getHistory(spaceId, 'dashboard', req.params.id, {
        size: perPage,
        from: perPage ? (page - 1) * perPage : undefined, // `page` is 1-indexed; `from` is an offset
      });

      const uids = new Set(items.flatMap((item) => (item.user?.id ? [item.user.id] : [])));
      const profiles =
        uids.size > 0
          ? await (await coreSetup.getStartServices())[0].userProfile.bulkGet({ uids })
          : [];
      const profileByUid = new Map(profiles.map((profile) => [profile.uid, profile]));

      return res.ok({
        body: {
          total,
          items: items.map((item, index) => {
            const user = item.user;
            const profile = user.id ? profileByUid.get(user.id) : undefined;
            const changeCount = item.metadata?.changeCount;
            return {
              id: item.event.id,
              action: item.event.action,
              isCurrent: page === 1 && index === 0,
              timestamp: item['@timestamp'],
              actor: {
                name: profile?.user.full_name || user.name,
                id: user.id,
              },
              ...(typeof changeCount === 'number' ? { changes: { count: changeCount } } : {}),
              ...('restoredFrom' in (item.metadata ?? {})
                ? {
                    comment: i18n.translate('dashboard.changeHistory.restoredFromComment', {
                      defaultMessage: 'Restored from v{version}',
                      values: { version: item.metadata!.restoredFrom as number },
                    }),
                  }
                : {}),
              metadata: {
                version: item.object.sequence,
              },
            };
          }),
        },
      });
    }
  );
};
