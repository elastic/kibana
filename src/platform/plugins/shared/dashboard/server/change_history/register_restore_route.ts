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
import type { DashboardState } from '@kbn/as-code-dashboard-schema';

import { getDashboardStateSchema } from '../api/dashboard_state_schemas';
import { getChangeHistoryClient } from './change_history_service';
import { spacesService } from '../kibana_services';
import { update } from '../api/update/update';

export type RestoreChangeResponse = DashboardState;

export const registerRestoreChangeRoute = (router: IRouter<RequestHandlerContext>) => {
  router.get(
    {
      path: '/internal/dashboard/change_history/{id}/restore/{changeId}',
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
            body: () => getDashboardStateSchema(true, true),
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
      const spaceId = spacesService?.getSpaceId(req) ?? 'default';

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
        undefined,
        spacesService?.getSpaceId(req),
        true,
        item.object.sequence
      );
      console.log({ result });
      return res.ok({ body: result.body.data });
    }
  );
};
