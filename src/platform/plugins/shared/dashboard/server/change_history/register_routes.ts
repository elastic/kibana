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
import type { CoreSetup, IRouter, RequestHandlerContext } from '@kbn/core/server';
import { z } from '@kbn/zod';

import { getDashboardStateSchema } from '../api/dashboard_state_schemas';
import type { DashboardPluginStart } from '../types';
import type { SetupDeps, StartDeps } from '../plugin';
import { getChangeHistoryClient } from './change_history_service';

export function registerChangeHistoryRoute(
  services: SetupDeps,
  core: CoreSetup<StartDeps, DashboardPluginStart>,
  router: IRouter<RequestHandlerContext>
) {
  registerAddToHistoryRoute(services, router);
  registerGetHistoryRoute(services, core, router);
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
        userProfileId: user.profile_uid,
        spaceId,
      });
      return res.ok();
    }
  );
};

const registerGetHistoryRoute = (
  services: SetupDeps,
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
            body: () =>
              z.object({
                items: z.array(
                  z.object({
                    id: z.string(),
                    timestamp: z.string(),
                    actor: z.object({ name: z.string(), id: z.string().optional() }),
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

      const { total, items } = await client.getHistory(spaceId, 'dashboard', req.params.id);

      const [coreStart] = await coreSetup.getStartServices();
      const uids = new Set(items.flatMap((item) => (item.user?.id ? [item.user.id] : [])));

      const profiles = await coreStart.userProfile.bulkGet({ uids });
      const fullNameByUid = new Map(profiles.map((profile) => [profile.uid, profile]));

      console.log({ items, uids, profiles, fullNameByUid });
      return res.ok({
        body: {
          total,
          items: items.map((item) => {
            const user = item.user;
            const profile = user.id ? fullNameByUid.get(user.id) : undefined;

            return {
              id: item.event.id,
              action: item.event.action,
              timestamp: item['@timestamp'],
              actor: {
                name: profile?.user.full_name || user.name,
                id: user.id,
              },
              changes: item.object.snapshot,
            };
          }),
        },
      });
    }
  );
};
