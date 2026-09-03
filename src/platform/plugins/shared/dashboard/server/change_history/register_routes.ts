/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeIdSchema } from '@kbn/as-code-shared-schemas';
import type { ObjectChange } from '@kbn/change-history';
import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import { z } from '@kbn/zod';

import { getDashboardStateSchema } from '../api/dashboard_state_schemas';
import type { SetupDeps } from '../plugin';
import { getChangeHistoryClient } from './change_history_service';

export function registerChangeHistoryRoute(
  services: SetupDeps,
  router: IRouter<RequestHandlerContext>
) {
  registerAddToHistoryRoute(services, router);
  registerGetHistoryRoute(services, router);
}

const registerAddToHistoryRoute = (services: SetupDeps, router: IRouter<RequestHandlerContext>) => {
  router.post(
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
          body: getDashboardStateSchema(true),
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
      console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
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

      const user = core.security.authc.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      let client;
      try {
        client = getChangeHistoryClient();
      } catch {
        return res.customError({ statusCode: 503, body: 'Change history service is not ready' });
      }
      const change: ObjectChange = {
        objectType: 'dashboard',
        objectId: req.params.id,
        snapshot: req.body, // post-change state
      };
      const spaceId = services.spaces?.spacesService.getSpaceId(req) ?? 'default';
      await client.log(change, {
        action: 'dashboard_save',
        username: user.username,
        spaceId,
      });
      return res.ok();
    }
  );
};

const registerGetHistoryRoute = (services: SetupDeps, router: IRouter<RequestHandlerContext>) => {
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
            body: () =>
              z.object({
                items: z.array(
                  z.object({
                    id: z.string(),
                    timestamp: z.string(),
                    actor: z.object({ name: z.string() }),
                    action: z.string(),
                    changes: z.record(z.string(), z.any()).optional(),
                    metadata: z.record(z.string(), z.any()).optional(),
                  })
                ),
                total: z.number(),
              }),
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
      console.log('123 !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
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

      const user = core.security.authc.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      let client;
      try {
        client = getChangeHistoryClient();
      } catch {
        return res.customError({ statusCode: 503, body: 'Change history service is not ready' });
      }
      const spaceId = services.spaces?.spacesService.getSpaceId(req) ?? 'default';

      const { total, items } = await client.getHistory(spaceId, 'dashboard', req.params.id);
      console.log({ total, items, id: req.params.id });
      return res.ok({
        body: {
          total,
          items: items.map((item) => ({
            id: item.event.id,
            action: item.event.action,
            timestamp: item['@timestamp'],
            actor: { name: item.user.name },
            changes: item.object.snapshot,
          })),
        },
      });
    }
  );
};
