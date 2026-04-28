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
      path: '/internal/dashboard/user_activity/view/{id}',
      validate: {
        params: schema.object({
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
        message: `User ${
          user ? `"${user.username}" (id: ${user.profile_uid})` : ''
        } viewed dashboard "${req.body.title}" (id: ${req.id}).`,
        event: {
          action: 'dashboard_view',
          type: 'access',
          start: new Date(req.body.start ?? 0).toString(),
          end: new Date(req.body.end).toString(),
          duration,
        },
        object: await getUserActivityObject({ id: req.id, data: req.body }, req),
        metadata: {
          userId: user?.profile_uid,
          username: user?.username,
          dashboardId: req.id,
          dashboardTitle: req.body.title,
          duration,
        },
      });
      return res.ok({ body: {} });
    }
  );
}
