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
import { schema } from '@kbn/config-schema';
import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import { timeRangeSchema } from '@kbn/es-query-server';

import { coreServices } from '../kibana_services';
import { getUserActivityObject } from './user_actions';

export function registerTrackUserActivityRoute(router: IRouter<RequestHandlerContext>) {
  router.post(
    {
      path: '/internal/dashboard/user_activity/{type}/{id}',
      validate: {
        params: schema.object({
          type: schema.oneOf([schema.literal('view'), schema.literal('refresh')]),
          id: schema.string(),
        }),
        body: schema.object({
          title: schema.string(),
          start: schema.number(),
          end: schema.number(),
          tags: schema.arrayOf(schema.string(), { maxSize: 100 }),
          meta: schema.maybe(
            schema.object({
              time_range: schema.maybe(timeRangeSchema),
              refresh_interval: schema.maybe(schema.number()),
              query: schema.maybe(asCodeQuerySchema),
              filters: schema.maybe(
                schema.arrayOf(asCodeFilterSchema, {
                  maxSize: 100,
                })
              ),
              panel_count: schema.number(),
              errors: schema.arrayOf(
                schema.object({ panel_id: schema.string(), error: schema.string() }),
                {
                  maxSize: 100,
                }
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
        },
        object: await getUserActivityObject({ id: req.params.id, data: req.body }, req),
        ...(req.body.meta && {
          metadata: req.body.meta,
        }),
      });
      return res.ok();
    }
  );
}
