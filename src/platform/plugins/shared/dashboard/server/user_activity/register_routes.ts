/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { HttpServiceSetup } from '@kbn/core/server';
import { querySchema, storedFilterSchema, timeRangeSchema } from '@kbn/es-query-server';
import { coreServices } from '../kibana_services';
import { getUserActivityObject } from './user_actions';

export function registerTrackDashboardViewRoute({ http }: { http: HttpServiceSetup }) {
  const router = http.createRouter();
  router.post(
    {
      path: '/internal/dashboard/user_activity/{type}/{id}',
      validate: {
        params: schema.object({
          type: schema.oneOf([
            schema.literal('view'),
            schema.literal('refresh_manual'),
            schema.literal('refresh_auto'),
          ]),
          id: schema.string(),
        }),
        body: schema.object({
          title: schema.string(),
          start: schema.number(),
          end: schema.number(),
          tags: schema.arrayOf(schema.string()),
          meta: schema.maybe(
            schema.object({
              time_range: schema.maybe(timeRangeSchema),
              query: schema.maybe(querySchema),
              filters: schema.maybe(
                schema.arrayOf(storedFilterSchema, {
                  maxSize: 100,
                })
              ),
              panel_count: schema.maybe(schema.number()),
              errors: schema.maybe(
                schema.arrayOf(schema.object({ panel_id: schema.string(), error: schema.string() }))
              ),
            })
          ),
        }),
      },
      security: {
        authz: {
          requiredPrivileges: ['read'],
        },
      },
    },
    async (ctx, req, res) => {
      const user = (await ctx.core).security.authc.getCurrentUser();
      const duration = req.body.start !== undefined ? req.body.end - req.body.start : 0;
      coreServices.userActivity.trackUserAction({
        message:
          req.params.type === 'refresh_auto'
            ? `Dashboard "${req.body.title}" (id: ${req.params.id}) was refreshed automatically.`
            : `User ${user ? `"${user.username}"` : ''} ${
                req.params.type === 'view' ? 'viewed' : 'manually refreshed'
              } dashboard "${req.body.title}" (id: ${req.params.id}).`,
        event: {
          action: req.params.type === 'view' ? 'dashboard_view' : 'dashboard_refresh',
          type: 'access',
          start: new Date(req.body.start).toISOString(),
          end: new Date(req.body.end).toISOString(),
          duration,
        },
        object: await getUserActivityObject({ id: req.params.id, data: req.body }, req),
        ...(req.body.meta
          ? {
              metadata: req.body.meta,
            }
          : {}),
      });
      return res.ok();
    }
  );
}
