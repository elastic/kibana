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
import type { SetupDeps } from '../plugin';
import { getChangeHistoryClient } from './change_history_service';

const detailsResponseSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actor: z.object({
    name: z.string(),
    profileId: z.string().optional(),
  }),
  action: z.string(),
  snapshot: getDashboardStateSchema(true),
});
export type ChangeDetailsResponse = z.infer<typeof detailsResponseSchema>;

export const registerChangeDetailsRoute = (
  services: SetupDeps,
  router: IRouter<RequestHandlerContext>
) => {
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
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    async (ctx, req, res) => {
      const core = await ctx.core;
      const esClient = core.elasticsearch.client.asCurrentUser;
      const { has_all_requested: hasAllPrivileges } = await esClient.security.hasPrivileges({
        application: [
          {
            application: `kibana-.kibana`,
            resources: ['*'],
            privileges: [`feature_dashboard_v2.edit`],
          },
        ],
      });

      if (!hasAllPrivileges) {
        return res.forbidden();
      }

      let client;
      try {
        client = getChangeHistoryClient();
      } catch {
        return res.customError({ statusCode: 503, body: 'Change history service is not ready' });
      }
      const spaceId = services.spaces?.spacesService.getSpaceId(req) ?? 'default';

      const { total, items } = await client.getHistory(spaceId, 'dashboard', req.params.id, {
        additionalFilters: [{ term: { 'event.id': req.params.changeId } }],
        size: 1,
      });
      console.log({
        total,
        changeId: req.params.changeId,
        item: JSON.stringify(items[0], null, 2),
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
        },
      });
    }
  );
};
