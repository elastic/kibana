/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import { asCodeQuerySchema } from '@kbn/as-code-shared-schemas';
import { z } from '@kbn/zod';
import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import { timeRangeSchema } from '@kbn/es-query-server';

import { coreServices } from '../kibana_services';
import { getUserActivityObject } from './user_actions';

export function registerTrackUserActivityRoute(router: IRouter<RequestHandlerContext>) {
  router.post(
    {
      path: '/internal/dashboard/user_activity/{type}/{id}',
      validate: {
        params: z
          .object({
            type: z.union([z.literal('view'), z.literal('refresh')]),
            id: z.string().max(100),
          })
          .strict(),
        body: z
          .object({
            title: z.string().max(100),
            start: z.number(),
            end: z.number(),
            tags: z.array(z.string().max(100)).max(100),
            meta: z
              .object({
                time_range: timeRangeSchema.optional(),
                refresh_interval: z.number().optional(),
                query: asCodeQuerySchema.optional(),
                filters: z.array(asCodeFilterSchema).max(100).optional(),
                panel_count: z.number(),
                errors: z
                  .array(
                    z
                      .object({
                        panel_id: z.string().max(100),
                        error: z.string().max(100),
                      })
                      .strict()
                  )
                  .max(100),
              })
              .strict()
              .optional(),
          })
          .strict(),
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
            privileges: [`feature_dashboard_v2.read`],
          },
        ],
      });
      if (!hasAllPrivileges) {
        res.forbidden();
      }

      const user = core.security.authc.getCurrentUser();
      const hasPanelErrors = (req.body.meta?.errors ?? []).length;
      coreServices.userActivity.trackUserAction({
        message: `User ${user ? `"${user.username}"` : ''} ${
          req.params.type === 'view' ? 'viewed' : 'refreshed'
        } dashboard "${req.body.title}" (id: ${req.params.id}).`,
        event: {
          action: req.params.type === 'view' ? 'dashboard_view' : 'dashboard_refresh',
          type: 'access',
          start: new Date(req.body.start).toISOString(),
          end: new Date(req.body.end).toISOString(),
          duration: (req.body.end - req.body.start) * 1000000, // convert to nanoseconds
          outcome: hasPanelErrors ? 'failure' : 'success',
        },
        ...(hasPanelErrors && {
          error: { type: 'panel_errors', message: JSON.stringify(req.body.meta!.errors) },
        }),
        object: await getUserActivityObject({ id: req.params.id, data: req.body }, req),
        ...(req.body.meta && {
          metadata: req.body.meta,
        }),
      });
      return res.ok();
    }
  );
}
