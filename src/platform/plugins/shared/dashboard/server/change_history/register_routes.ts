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
import type { SetupDeps, StartDeps } from '../plugin';
import type { DashboardPluginStart } from '../types';
import { getChangeHistoryClient } from './change_history_service';
import { registerChangeDetailsRoute } from './register_details_route';
import { registerHistoryListRoute } from './register_list_route';

export function registerChangeHistoryRoute(
  services: SetupDeps,
  core: CoreSetup<StartDeps, DashboardPluginStart>,
  router: IRouter<RequestHandlerContext>
) {
  registerAddToHistoryRoute(services, router);
  registerHistoryListRoute(services, core, router);
  registerChangeDetailsRoute(services, router);
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
      console.log('!!!!!! TYPEOF', typeof req.body);
      const change: ObjectChange = {
        objectType: 'dashboard',
        objectId: req.params.id,
        snapshot: req.body, // post-change state
      };
      const spaceId = services.spaces?.spacesService.getSpaceId(req) ?? 'default';
      await client.log(change, {
        action: 'dashboard_update',
        username: user.username,
        userProfileId: user.profile_uid,
        spaceId,
      });
      return res.ok();
    }
  );
};
