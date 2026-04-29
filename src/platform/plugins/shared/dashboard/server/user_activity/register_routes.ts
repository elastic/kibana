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
import { coreServices } from '../kibana_services';
import { getUserActivityObject } from './user_actions';

export function registerTrackDashboardViewRoute({ http }: { http: HttpServiceSetup }) {
  const router = http.createRouter();
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
          start: schema.maybe(schema.number()),
          end: schema.number(),
          tags: schema.maybe(schema.arrayOf(schema.string())),
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
        message: `User ${user ? `"${user.username}" (id: ${user.profile_uid})` : ''} ${
          req.params.type === 'view' ? 'viewed' : 'manually refreshed'
        } dashboard "${req.body.title}" (id: ${req.id}).`,
        event: {
          action: req.params.type === 'view' ? 'dashboard_view' : 'dashboard_manual_refresh',
          type: 'access',
          start: new Date(req.body.start ?? 0).toISOString(),
          end: new Date(req.body.end).toISOString(),
          duration,
        },
        object: await getUserActivityObject({ id: req.id, data: req.body }, req),
        metadata: {
          user_id: user?.profile_uid,
          username: user?.username,
          dashboard_id: req.id,
          dashboard_title: req.body.title,
          duration,
        },
      });
      return res.ok({ body: {} });
    }
  );
}
