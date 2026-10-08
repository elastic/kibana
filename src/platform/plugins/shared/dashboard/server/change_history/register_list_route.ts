/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as jsondiffpatch from 'jsondiffpatch';
import * as jsonpatchFormatter from 'jsondiffpatch/formatters/jsonpatch';

import { i18n } from '@kbn/i18n';
import { asCodeIdSchema } from '@kbn/as-code-shared-schemas';
import type { CoreSetup, IRouter, RequestHandlerContext } from '@kbn/core/server';
import { z } from '@kbn/zod';

import type { StartDeps } from '../plugin';
import type { DashboardPluginStart } from '../types';
import { getChangeHistoryClient } from './change_history_service';
import { spacesService } from '../kibana_services';

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

      const { total, items } = await client.getHistory(
        spaceId,
        'dashboard',
        req.params.id
        // {
        // additionalFilters: [{ term: { 'event.action': 'dashboard_update' } }],
        // }
      );

      const [coreStart] = await coreSetup.getStartServices();
      const uids = new Set(items.flatMap((item) => (item.user?.id ? [item.user.id] : [])));

      const profiles = await coreStart.userProfile.bulkGet({ uids });
      const fullNameByUid = new Map(profiles.map((profile) => [profile.uid, profile]));

      return res.ok({
        body: {
          total,
          items: items.map((item, index) => {
            const user = item.user;
            const profile = user.id ? fullNameByUid.get(user.id) : undefined;
            const changes =
              index + 1 < items.length
                ? jsonpatchFormatter.format(
                    jsondiffpatch.diff(item.object.snapshot, items[index + 1].object.snapshot)
                  )
                : undefined;
            return {
              id: item.event.id,
              action: item.event.action,
              isCurrent: (req.query.page ?? 1) === 1 && index === 0,
              timestamp: item['@timestamp'],
              actor: {
                name: profile?.user.full_name || user.name,
                id: user.id,
              },
              ...(changes ? { changes: { count: changes.length } } : {}),
              ...('restoredFrom' in (item.metadata ?? {})
                ? {
                    comment: i18n.translate('dashboard.changeHistory.versionBadge', {
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
